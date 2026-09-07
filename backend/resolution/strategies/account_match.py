from sqlalchemy.engine import Connection
from sqlalchemy import text
import uuid
from datetime import datetime, timezone
from backend.shared.schema import canonical_events_table, entities_table, ConfidenceTier
import json

def execute(conn: Connection, case_id: str) -> dict:
    query = text("""
        SELECT DISTINCT raw_val FROM (
            SELECT actor_raw as raw_val FROM canonical_events 
            WHERE case_id = :case_id AND event_type = 'BANK_TRANSFER' AND actor_raw IS NOT NULL AND actor_raw != ''
            UNION
            SELECT peer_raw as raw_val FROM canonical_events 
            WHERE case_id = :case_id AND event_type = 'BANK_TRANSFER' AND peer_raw IS NOT NULL AND peer_raw != ''
        ) sub
    """)
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    unique_accounts = {}
    for r in rows:
        norm = r.raw_val.strip()
        if norm and norm not in unique_accounts:
            unique_accounts[norm] = {"raw_vals": set()}
        if norm:
            unique_accounts[norm]["raw_vals"].add(r.raw_val)
            
    now_iso = datetime.now(timezone.utc).isoformat()
    new_entities = []
    entities_created = 0
    
    for norm_acc, data in unique_accounts.items():
        entity_id = str(uuid.uuid4())
        data["entity_id"] = entity_id
        new_entities.append({
            "id": entity_id,
            "case_id": case_id,
            "entity_type": "ACCOUNT",
            "canonical_id": norm_acc,
            "label": f"Account {norm_acc}",
            "metadata_json": json.dumps({"source": "account_match", "raw_values": list(data["raw_vals"])}),
            "created_at": now_iso
        })
        entities_created += 1
        
    if new_entities:
        conn.execute(entities_table.insert(), new_entities)
        
    for norm_acc, data in unique_accounts.items():
        for raw_val in data["raw_vals"]:
            conn.execute(text("""
                UPDATE canonical_events
                SET actor_entity_id = :ent_id
                WHERE case_id = :case_id AND actor_raw = :raw_val AND event_type = 'BANK_TRANSFER'
            """), {"ent_id": data["entity_id"], "case_id": case_id, "raw_val": raw_val})
            
            conn.execute(text("""
                UPDATE canonical_events
                SET peer_entity_id = :ent_id
                WHERE case_id = :case_id AND peer_raw = :raw_val AND event_type = 'BANK_TRANSFER'
            """), {"ent_id": data["entity_id"], "case_id": case_id, "raw_val": raw_val})

    return {"entities_created": entities_created, "links_created": 0}
