from sqlalchemy.engine import Connection
from sqlalchemy import select
import uuid
from backend.shared.schema import canonical_events, entities, entity_links
from datetime import timedelta

def execute(conn: Connection, case_id: str) -> dict:
    """
    If two MSISDN entities have IPDR_SESSION events to the same dst_ip within ±15 min 
    of each other -> PROBABLE link (confidence 0.65).
    """
    # Fetch all IPDR events
    stmt = select(
        canonical_events.c.id,
        canonical_events.c.actor_raw,
        canonical_events.c.peer_raw, # Assuming dst_ip is in peer_raw
        canonical_events.c.ts_start
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.event_type == 'IPDR_SESSION',
        canonical_events.c.peer_raw != None
    )
    rows = conn.execute(stmt).fetchall()
    
    # Map normalized phone to entity ID
    ent_stmt = select(entities.c.id, entities.c.canonical_value).where(
        entities.c.case_id == case_id,
        entities.c.type == 'PHONE'
    )
    ent_rows = conn.execute(ent_stmt).fetchall()
    phone_to_ent_id = {r.canonical_value: r.id for r in ent_rows}
    from backend.resolution.phone_norm import normalize_phone

    links_created = 0
    new_links = []
    
    # Simple O(N^2) comparison for hackathon
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            r1 = rows[i]
            r2 = rows[j]
            
            # Same IP
            if r1.peer_raw == r2.peer_raw:
                # Within 15 minutes
                if abs((r1.ts_start - r2.ts_start).total_seconds()) <= 15 * 60:
                    phone1 = normalize_phone(r1.actor_raw)
                    phone2 = normalize_phone(r2.actor_raw)
                    
                    if phone1 != phone2:
                        ent1 = phone_to_ent_id.get(phone1)
                        ent2 = phone_to_ent_id.get(phone2)
                        
                        if ent1 and ent2:
                            new_links.append({
                                "id": str(uuid.uuid4()),
                                "entity_a": ent1,
                                "entity_b": ent2,
                                "link_type": "SHARED_IP",
                                "confidence": 0.65,
                                "evidence_json": [r1.id, r2.id]
                            })
                            links_created += 1

    if new_links:
        conn.execute(entity_links.insert(), new_links)
        
    return {"entities_created": 0, "links_created": links_created}
