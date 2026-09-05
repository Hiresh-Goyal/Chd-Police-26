from sqlalchemy.engine import Connection
from sqlalchemy import select
import uuid
from collections import defaultdict
from backend.shared.schema import canonical_events, entities, ConfidenceTier
from backend.resolution.phone_norm import normalize_phone

def execute(conn: Connection, case_id: str) -> dict:
    """
    Group canonical_events by normalized actor_raw.
    All events sharing the same normalized MSISDN -> same entity.
    Confidence: 0.95. Create entity row (type=PHONE).
    Returns stats.
    """
    # Fetch all CALL and SMS events (or any with phone numbers)
    # For now, we assume all actor_raw in CALL, SMS, IPDR_SESSION, LOCATION_PING are phones
    # But let's just get everything where event_type in ('CALL', 'SMS', 'IPDR_SESSION', 'LOCATION_PING')
    # Actually, the instructions say: Group canonical_events by normalized actor_raw. 
    # Let's filter by event types that use MSISDN.
    stmt = select(
        canonical_events.c.id,
        canonical_events.c.actor_raw
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.event_type.in_(['CALL', 'SMS', 'IPDR_SESSION', 'LOCATION_PING'])
    )
    
    rows = conn.execute(stmt).fetchall()
    
    # Group by normalized phone
    grouped = defaultdict(list)
    for r in rows:
        norm = normalize_phone(r.actor_raw)
        if norm:
            grouped[norm].append(r.id)
            
    entities_created = 0
    # Insert entities
    new_entities = []
    for norm_phone, event_ids in grouped.items():
        entity_id = str(uuid.uuid4())
        new_entities.append({
            "id": entity_id,
            "case_id": case_id,
            "type": "PHONE",
            "canonical_value": norm_phone,
            "confidence_tier": ConfidenceTier.CONFIRMED.value,
            "source_ids": event_ids
        })
        entities_created += 1
        
    if new_entities:
        conn.execute(entities.insert(), new_entities)
        
    return {"entities_created": entities_created, "links_created": 0}
