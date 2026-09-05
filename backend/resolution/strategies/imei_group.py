from sqlalchemy.engine import Connection
from sqlalchemy import select
import uuid
from collections import defaultdict
from backend.shared.schema import canonical_events, entities, entity_links, ConfidenceTier
from backend.resolution.phone_norm import normalize_phone

def execute(conn: Connection, case_id: str) -> dict:
    """
    Group CALL/SMS events by device_id (IMEI). 
    Multiple MSISDNs sharing an IMEI -> link those PHONE entities together. 
    Confidence: 0.92.
    """
    # 1. Fetch events with IMEI
    stmt = select(
        canonical_events.c.id,
        canonical_events.c.device_id,
        canonical_events.c.actor_raw
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.event_type.in_(['CALL', 'SMS']),
        canonical_events.c.device_id != None
    )
    rows = conn.execute(stmt).fetchall()

    # Group by IMEI -> set of normalized phones
    imei_to_phones = defaultdict(set)
    imei_to_events = defaultdict(list)
    for r in rows:
        norm = normalize_phone(r.actor_raw)
        if norm and r.device_id:
            imei_to_phones[r.device_id].add(norm)
            imei_to_events[r.device_id].append(r.id)

    # 2. Map normalized phone to entity ID
    ent_stmt = select(entities.c.id, entities.c.canonical_value).where(
        entities.c.case_id == case_id,
        entities.c.type == 'PHONE'
    )
    ent_rows = conn.execute(ent_stmt).fetchall()
    phone_to_ent_id = {r.canonical_value: r.id for r in ent_rows}

    links_created = 0
    new_links = []
    
    # 3. Create CONFIRMED links between entities sharing IMEI
    for imei, phones in imei_to_phones.items():
        phones_list = list(phones)
        if len(phones_list) > 1:
            # create pairs
            for i in range(len(phones_list)):
                for j in range(i + 1, len(phones_list)):
                    ent_a = phone_to_ent_id.get(phones_list[i])
                    ent_b = phone_to_ent_id.get(phones_list[j])
                    if ent_a and ent_b:
                        link_id = str(uuid.uuid4())
                        new_links.append({
                            "id": link_id,
                            "entity_a": ent_a,
                            "entity_b": ent_b,
                            "link_type": "SHARED_IMEI",
                            "confidence": 0.92,
                            "evidence_json": imei_to_events[imei]
                        })
                        links_created += 1
                        
    if new_links:
        conn.execute(entity_links.insert(), new_links)
        
    return {"entities_created": 0, "links_created": links_created}
