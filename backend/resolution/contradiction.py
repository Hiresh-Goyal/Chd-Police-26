from dataclasses import dataclass
from typing import List
from sqlalchemy.engine import Connection
from sqlalchemy import select
from backend.shared.schema import canonical_events, entities

@dataclass
class ContradictionResult:
    entity_id: str
    event_id_a: str
    event_id_b: str
    reason: str # human-readable explanation
    downgrade_to: str # 'IMPOSSIBLE' or 'CANDIDATE'

def detect_contradictions(conn: Connection, case_id: str) -> List[ContradictionResult]:
    """
    If entity E has two events with overlapping ts_start-ts_end on different device_ids 
    -> create ContradictionResult.
    """
    # Fetch events with device_id mapped to entity
    stmt = select(
        canonical_events.c.id,
        canonical_events.c.actor_raw,
        canonical_events.c.ts_start,
        canonical_events.c.ts_end,
        canonical_events.c.device_id
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.device_id != None
    )
    rows = conn.execute(stmt).fetchall()
    
    ent_stmt = select(entities.c.id, entities.c.canonical_value).where(
        entities.c.case_id == case_id,
        entities.c.type == 'PHONE'
    )
    ent_rows = conn.execute(ent_stmt).fetchall()
    phone_to_ent_id = {r.canonical_value: r.id for r in ent_rows}
    from backend.resolution.phone_norm import normalize_phone

    results = []
    
    # O(N^2) comparison within same entity
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            r1 = rows[i]
            r2 = rows[j]
            
            p1 = normalize_phone(r1.actor_raw)
            p2 = normalize_phone(r2.actor_raw)
            
            if p1 == p2 and p1 in phone_to_ent_id:
                ent_id = phone_to_ent_id[p1]
                # Check overlapping time and diff device
                if r1.device_id != r2.device_id:
                    # check overlap
                    end1 = r1.ts_end or r1.ts_start
                    end2 = r2.ts_end or r2.ts_start
                    if max(r1.ts_start, r2.ts_start) <= min(end1, end2):
                        results.append(ContradictionResult(
                            entity_id=ent_id,
                            event_id_a=r1.id,
                            event_id_b=r2.id,
                            reason=f"Overlapping events on diff devices ({r1.device_id} vs {r2.device_id})",
                            downgrade_to="CANDIDATE"
                        ))
    return results

