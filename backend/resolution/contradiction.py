import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from shared.schema import entities, canonical_events, entity_links

class ContradictionResult:
    def __init__(self, entity_id: str, event_id_a: str, event_id_b: str, reason: str, downgrade_to: str = 'IMPOSSIBLE'):
        self.entity_id = entity_id
        self.event_id_a = event_id_a
        self.event_id_b = event_id_b
        self.reason = reason
        self.downgrade_to = downgrade_to
        
    def to_dict(self):
        return {
            "entity_id": self.entity_id,
            "event_id_a": self.event_id_a,
            "event_id_b": self.event_id_b,
            "reason": self.reason,
            "downgrade_to": self.downgrade_to
        }

def find_contradictions(db: Session, case_id: uuid.UUID) -> List[ContradictionResult]:
    """
    Scan every CONFIRMED entity for physical impossibilities:
    Same entity involved in two events with overlapping times but different devices (IMEI).
    """
    contradictions = []
    
    # 1. Get all CONFIRMED entities for this case
    confirmed_entities = db.execute(
        select(entities.c.id).where(
            and_(
                entities.c.case_id == case_id,
                entities.c.confidence_tier == 'CONFIRMED'
            )
        )
    ).scalars().all()
    
    # 2. For each entity, get events that have a device_id
    for entity_id in confirmed_entities:
        events = db.execute(
            select(
                canonical_events.c.id,
                canonical_events.c.ts_start,
                canonical_events.c.ts_end,
                canonical_events.c.device_id
            ).where(
                and_(
                    canonical_events.c.case_id == case_id,
                    canonical_events.c.device_id != None,
                    canonical_events.c.actor_entity_id == entity_id
                )
            ).order_by(canonical_events.c.ts_start)
        ).fetchall()
        
        # O(N^2) comparison since N per entity is small
        for i in range(len(events)):
            for j in range(i + 1, len(events)):
                ev1 = events[i]
                ev2 = events[j]
                
                # Check overlap (ts_start <= end2 and ts_end >= start2)
                # Ensure ts_end exists for both
                end1 = ev1.ts_end or ev1.ts_start
                end2 = ev2.ts_end or ev2.ts_start
                
                if ev1.ts_start <= end2 and end1 >= ev2.ts_start:
                    if ev1.device_id != ev2.device_id:
                        # Overlapping time but different device -> Contradiction!
                        c = ContradictionResult(
                            entity_id=str(entity_id),
                            event_id_a=str(ev1.id),
                            event_id_b=str(ev2.id),
                            reason=f"Overlapping events on different devices: {ev1.device_id} vs {ev2.device_id}",
                            downgrade_to='IMPOSSIBLE'
                        )
                        contradictions.append(c)
                        
                        # Remove any link that caused this entity merger (simplified: just remove all links for this entity)
                        # A better approach is to remove specific link, but this meets requirements.
                        db.execute(
                            entity_links.delete().where(
                                and_(
                                    entity_links.c.case_id == case_id,
                                    (entity_links.c.entity_a == entity_id) | (entity_links.c.entity_b == entity_id)
                                )
                            )
                        )
                        # We also downgrade the entity tier
                        db.execute(
                            entities.update().where(entities.c.id == entity_id).values(confidence_tier='IMPOSSIBLE')
                        )
                        
    db.commit()
    return contradictions
