from sqlalchemy.engine import Connection
from sqlalchemy import text
import uuid
from datetime import datetime, timezone
from backend.shared.schema import canonical_events_table, entities_table, ConfidenceTier
from backend.resolution.phone_norm import normalize_phone
import json

def execute(conn: Connection, case_id: str) -> dict:
    # Get all distinct actor_raw and peer_raw for phone-based events
    query = text("""
        SELECT DISTINCT raw_val FROM (
            SELECT actor_raw as raw_val FROM canonical_events 
            WHERE case_id = :case_id AND event_type IN ('CALL', 'SMS', 'IPDR_SESSION', 'LOCATION_PING') AND actor_raw IS NOT NULL AND actor_raw != ''
            UNION
            SELECT peer_raw as raw_val FROM canonical_events 
            WHERE case_id = :case_id AND event_type IN ('CALL', 'SMS', 'IPDR_SESSION', 'LOCATION_PING') AND peer_raw IS NOT NULL AND peer_raw != ''
        ) sub
    """)
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    unique_phones = {}
    for r in rows:
        norm = normalize_phone(r.raw_val)
        if norm and norm not in unique_phones:
            unique_phones[norm] = {"raw_vals": set()}
        if norm:
            unique_phones[norm]["raw_vals"].add(r.raw_val)
            
    now_iso = datetime.now(timezone.utc).isoformat()
    new_entities = []
    entities_created = 0
    
    # Insert entities
    for norm_phone, data in unique_phones.items():
        entity_id = str(uuid.uuid4())
        data["entity_id"] = entity_id
        new_entities.append({
            "id": entity_id,
            "case_id": case_id,
            "entity_type": "PHONE",
            "canonical_id": norm_phone,
            "label": f"Phone {norm_phone}",
            "metadata_json": json.dumps({"source": "msisdn_match", "raw_values": list(data["raw_vals"])}),
            "created_at": now_iso
        })
        entities_created += 1
        
    if new_entities:
        conn.execute(entities_table.insert(), new_entities)
        
    # Update canonical_events actor_entity_id
    for norm_phone, data in unique_phones.items():
        for raw_val in data["raw_vals"]:
            conn.execute(text("""
                UPDATE canonical_events
                SET actor_entity_id = :ent_id
                WHERE case_id = :case_id AND actor_raw = :raw_val
            """), {"ent_id": data["entity_id"], "case_id": case_id, "raw_val": raw_val})
            
            conn.execute(text("""
                UPDATE canonical_events
                SET peer_entity_id = :ent_id
                WHERE case_id = :case_id AND peer_raw = :raw_val
            """), {"ent_id": data["entity_id"], "case_id": case_id, "raw_val": raw_val})

    return {"entities_created": entities_created, "links_created": 0}
