import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text

def match_account(db: Session, case_id: uuid.UUID) -> dict:
    # 1. Insert distinct ACCOUNT entities
    sql_insert = text("""
        INSERT INTO entities (id, case_id, type, canonical_value, confidence_tier, first_seen, last_seen, source_ids)
        SELECT gen_random_uuid(), :case_id, 'ACCOUNT', actor_raw, 'CONFIRMED',
               MIN(ts_start), MAX(COALESCE(ts_end, ts_start)),
               jsonb_agg(DISTINCT source_file_id)
        FROM canonical_events
        WHERE case_id = :case_id AND event_type = 'BANK_TRANSFER' AND actor_raw IS NOT NULL
        GROUP BY actor_raw
    """)
    db.execute(sql_insert, {"case_id": case_id})
    
    # 2. Update actor_entity_id
    sql_update_actor = text("""
        UPDATE canonical_events ce
        SET actor_entity_id = e.id
        FROM entities e
        WHERE ce.case_id = :case_id AND e.case_id = :case_id
          AND ce.actor_raw = e.canonical_value
          AND e.type = 'ACCOUNT'
    """)
    db.execute(sql_update_actor, {"case_id": case_id})
    
    # 3. Update peer_entity_id
    sql_insert_peers = text("""
        INSERT INTO entities (id, case_id, type, canonical_value, confidence_tier, first_seen, last_seen, source_ids)
        SELECT gen_random_uuid(), :case_id, 'ACCOUNT', peer_raw, 'CONFIRMED',
               MIN(ts_start), MAX(COALESCE(ts_end, ts_start)),
               jsonb_agg(DISTINCT source_file_id)
        FROM canonical_events
        WHERE case_id = :case_id AND event_type = 'BANK_TRANSFER' AND peer_raw IS NOT NULL
          AND peer_raw NOT IN (SELECT canonical_value FROM entities WHERE case_id = :case_id AND type = 'ACCOUNT')
        GROUP BY peer_raw
    """)
    db.execute(sql_insert_peers, {"case_id": case_id})
    
    sql_update_peer = text("""
        UPDATE canonical_events ce
        SET peer_entity_id = e.id
        FROM entities e
        WHERE ce.case_id = :case_id AND e.case_id = :case_id
          AND ce.peer_raw = e.canonical_value
          AND e.type = 'ACCOUNT'
    """)
    db.execute(sql_update_peer, {"case_id": case_id})
    
    db.commit()
    return {"status": "ok"}
