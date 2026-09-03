from sqlalchemy.engine import Connection
from sqlalchemy import select
import uuid
from backend.shared.schema import canonical_events, entities, entity_links
from datetime import timedelta

def execute(conn: Connection, case_id: str) -> dict:
    """
    If two PHONE entities have events at the same tower_id within ±30 min -> PROBABLE link (confidence 0.70).
    """
    stmt = select(
        canonical_events.c.id,
        canonical_events.c.actor_raw,
        canonical_events.c.location_raw, # tower_id
        canonical_events.c.ts_start
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.location_raw != None
    )
    rows = conn.execute(stmt).fetchall()
    
    ent_stmt = select(entities.c.id, entities.c.canonical_value).where(
        entities.c.case_id == case_id,
        entities.c.type == 'PHONE'
    )
    ent_rows = conn.execute(ent_stmt).fetchall()
    phone_to_ent_id = {r.canonical_value: r.id for r in ent_rows}
    from backend.resolution.phone_norm import normalize_phone

    links_created = 0
    new_links = []
    
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            r1 = rows[i]
            r2 = rows[j]
            
            if r1.location_raw == r2.location_raw:
                if abs((r1.ts_start - r2.ts_start).total_seconds()) <= 30 * 60:
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
                                "link_type": "CO_LOCATION",
                                "confidence": 0.70,
                                "evidence_json": [r1.id, r2.id]
                            })
                            links_created += 1

    if new_links:
        conn.execute(entity_links.insert(), new_links)
        
    return {"entities_created": 0, "links_created": links_created}
