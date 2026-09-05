import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text

def match_msisdn(db: Session, case_id: uuid.UUID) -> dict:
    # Exact MSISDN match
    # 1. Create entities for all distinct actor_raw where event_type in CALL, SMS, IPDR_SESSION
    # 2. Update canonical_events actor_entity_id
    
    # 1. Insert distinct PHONE entities
    sql_insert = text("""
        INSERT INTO entities (id, case_id, type, canonical_value, confidence_tier, first_seen, last_seen, source_ids)
        SELECT gen_random_uuid(), :case_id, 'PHONE', actor_raw, 'CONFIRMED',
               MIN(ts_start), MAX(COALESCE(ts_end, ts_start)),
               jsonb_agg(DISTINCT source_file_id)
        FROM canonical_events
        WHERE case_id = :case_id AND event_type IN ('CALL', 'SMS', 'IPDR_SESSION') AND actor_raw IS NOT NULL
        GROUP BY actor_raw
        ON CONFLICT DO NOTHING
    """)
    db.execute(sql_insert, {"case_id": case_id})
    
    # 2. Update actor_entity_id
    sql_update_actor = text("""
        UPDATE canonical_events ce
        SET actor_entity_id = e.id
        FROM entities e
        WHERE ce.case_id = :case_id AND e.case_id = :case_id
          AND ce.actor_raw = e.canonical_value
          AND e.type = 'PHONE'
    """)
    db.execute(sql_update_actor, {"case_id": case_id})
    
    # 3. Update peer_entity_id (peers that haven't been seen as actors might not have entities yet, so let's insert them too)
    sql_insert_peers = text("""
        INSERT INTO entities (id, case_id, type, canonical_value, confidence_tier, first_seen, last_seen, source_ids)
        SELECT gen_random_uuid(), :case_id, 'PHONE', peer_raw, 'CONFIRMED',
               MIN(ts_start), MAX(COALESCE(ts_end, ts_start)),
               jsonb_agg(DISTINCT source_file_id)
        FROM canonical_events
        WHERE case_id = :case_id AND event_type IN ('CALL', 'SMS') AND peer_raw IS NOT NULL
          AND peer_raw NOT IN (SELECT canonical_value FROM entities WHERE case_id = :case_id AND type = 'PHONE')
        GROUP BY peer_raw
    """)
    db.execute(sql_insert_peers, {"case_id": case_id})
    
    sql_update_peer = text("""
        UPDATE canonical_events ce
        SET peer_entity_id = e.id
        FROM entities e
        WHERE ce.case_id = :case_id AND e.case_id = :case_id
          AND ce.peer_raw = e.canonical_value
          AND e.type = 'PHONE'
    """)
    db.execute(sql_update_peer, {"case_id": case_id})
    
    db.commit()
    return {"status": "ok"}
