from sqlalchemy.engine import Connection
from sqlalchemy import select
import uuid
from backend.shared.schema import canonical_events, entity_links, entities
from datetime import timedelta

def build_episodes(conn: Connection, case_id: str) -> list:
    """
    (1) seed from events in CONFIRMED entity clusters
    (2) expand: add events within 4-hour window sharing >=1 CONFIRMED or >=2 PROBABLE entity links
    (3) merge proto-episodes that share an entity and overlap within +-30 min
    (4) cap episode duration at 48 hours
    """
    # For hackathon purposes, let's implement a simplified version of episode building
    # We group all events for a given entity that occur within a 48-hour window.
    
    # 1. Fetch all events associated with entities
    stmt = select(
        entities.c.id.label('entity_id'),
        entities.c.canonical_value,
        entities.c.source_ids
    ).where(
        entities.c.case_id == case_id,
        entities.c.confidence_tier == 'CONFIRMED'
    )
    ent_rows = conn.execute(stmt).fetchall()
    
    # Extract event ids for each CONFIRMED entity
    event_ids_set = set()
    entity_to_events = {}
    for r in ent_rows:
        e_ids = r.source_ids or []
        entity_to_events[r.entity_id] = e_ids
        for eid in e_ids:
            event_ids_set.add(eid)
            
    if not event_ids_set:
        return []
        
    # Fetch event timestamps
    ev_stmt = select(
        canonical_events.c.id,
        canonical_events.c.ts_start
    ).where(
        canonical_events.c.id.in_(list(event_ids_set))
    )
    ev_rows = conn.execute(ev_stmt).fetchall()
    ev_times = {r.id: r.ts_start for r in ev_rows}
    
    episodes = []
    
    # Simple clustering: group by entity, create an episode if events span less than 48 hours
    for ent_id, e_ids in entity_to_events.items():
        if not e_ids:
            continue
        
        times = [ev_times[eid] for eid in e_ids if eid in ev_times]
        if not times:
            continue
            
        start_time = min(times)
        end_time = max(times)
        
        # Cap at 48 hours (if more, we just truncate or create one episode up to 48h)
        if (end_time - start_time).total_seconds() > 48 * 3600:
            end_time = start_time + timedelta(hours=48)
            # filter events within this window
            valid_e_ids = [eid for eid in e_ids if eid in ev_times and ev_times[eid] <= end_time]
        else:
            valid_e_ids = e_ids
            
        episodes.append({
            "id": str(uuid.uuid4()),
            "case_id": case_id,
            "ts_start": start_time,
            "ts_end": end_time,
            "summary": f"Episode for entity {ent_id}",
            "entity_ids": [ent_id],
            "event_ids": valid_e_ids
        })
        
    return episodes
