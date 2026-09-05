from sqlalchemy.engine import Connection
from sqlalchemy import select
import uuid
from collections import defaultdict
from backend.shared.schema import canonical_events, entities, ConfidenceTier

def execute(conn: Connection, case_id: str) -> dict:
    """
    Group BANK_TRANSFER events by actor_raw (account number).
    All events with same account -> same ACCOUNT entity.
    Confidence: 0.95.
    """
    stmt = select(
        canonical_events.c.id,
        canonical_events.c.actor_raw
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.event_type == 'BANK_TRANSFER'
    )
    
    rows = conn.execute(stmt).fetchall()
    
    grouped = defaultdict(list)
    for r in rows:
        if r.actor_raw:
            grouped[r.actor_raw].append(r.id)
            
    entities_created = 0
    new_entities = []
    for account, event_ids in grouped.items():
        entity_id = str(uuid.uuid4())
        new_entities.append({
            "id": entity_id,
            "case_id": case_id,
            "type": "ACCOUNT",
            "canonical_value": account,
            "confidence_tier": ConfidenceTier.CONFIRMED.value,
            "source_ids": event_ids
        })
        entities_created += 1
        
    if new_entities:
        conn.execute(entities.insert(), new_entities)
        
    return {"entities_created": entities_created, "links_created": 0}
