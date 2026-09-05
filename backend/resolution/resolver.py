import uuid
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from resolution.contradiction import find_contradictions
from resolution.strategies.msisdn_match import match_msisdn
from resolution.strategies.account_match import match_account
from resolution.strategies.imei_group import group_imei

def resolve(db: Session, case_id: uuid.UUID) -> Dict[str, Any]:
    """
    Run all resolution strategies in order.
    Returns {entities_created, links_created, contradictions: list[ContradictionResult]}
    """
    # Clear existing entities and links
    db.execute(text("DELETE FROM entity_links WHERE case_id = :case_id"), {"case_id": case_id})
    db.execute(text("DELETE FROM entities WHERE case_id = :case_id"), {"case_id": case_id})
    db.execute(
        text("UPDATE canonical_events SET actor_entity_id = NULL, peer_entity_id = NULL, episode_id = NULL WHERE case_id = :case_id"),
        {"case_id": case_id}
    )
    db.commit()
    
    # Run exact matching to create base entities
    match_msisdn(db, case_id)
    match_account(db, case_id)
    
    # Run IMEI grouping (multi-SIM)
    group_imei(db, case_id)
    
    # Social phone -> CDR MSISDN (PROBABLE)
    # The phone_raw is in peer_raw for social events if available
    # Just link SOCIAL entity to PHONE entity
    sql_social = text("""
        WITH social_phones AS (
            SELECT id as event_id, actor_raw as social_id, peer_raw as phone 
            FROM canonical_events 
            WHERE case_id = :case_id AND event_type IN ('SOCIAL_POST', 'SOCIAL_INTERACTION') AND peer_raw IS NOT NULL
        )
        INSERT INTO entity_links (id, case_id, entity_a, entity_b, link_type, confidence, confidence_tier, evidence_event_ids)
        SELECT gen_random_uuid(), :case_id, e_soc.id, e_phone.id, 'SOCIAL', 0.75, 'PROBABLE', jsonb_build_array(sp.event_id)
        FROM social_phones sp
        -- Insert social entity if not exists first (simplified for hackathon: assuming they exist or we create them)
        -- We will just insert social entities right here to be safe
    """)
    # Actually, we need to create SOCIAL entities first.
    db.execute(text("""
        INSERT INTO entities (id, case_id, type, canonical_value, confidence_tier, first_seen, last_seen, source_ids)
        SELECT gen_random_uuid(), :case_id, 'SOCIAL', actor_raw, 'CONFIRMED', MIN(ts_start), MAX(COALESCE(ts_end, ts_start)), jsonb_agg(DISTINCT source_file_id)
        FROM canonical_events WHERE case_id = :case_id AND event_type IN ('SOCIAL_POST', 'SOCIAL_INTERACTION')
        GROUP BY actor_raw
    """), {"case_id": case_id})
    db.execute(text("""
        UPDATE canonical_events ce SET actor_entity_id = e.id FROM entities e
        WHERE ce.case_id = :case_id AND e.case_id = :case_id AND ce.actor_raw = e.canonical_value AND e.type = 'SOCIAL'
    """), {"case_id": case_id})
    db.commit()
    
    db.execute(text("""
        INSERT INTO entity_links (id, case_id, entity_a, entity_b, link_type, confidence, confidence_tier, evidence_event_ids)
        SELECT gen_random_uuid(), :case_id, e1.id, e2.id, 'SOCIAL', 0.75, 'PROBABLE', jsonb_build_array(ce.id)
        FROM canonical_events ce
        JOIN entities e1 ON ce.actor_entity_id = e1.id
        JOIN entities e2 ON ce.peer_raw = e2.canonical_value AND e2.type = 'PHONE'
        WHERE ce.case_id = :case_id AND ce.event_type IN ('SOCIAL_POST', 'SOCIAL_INTERACTION') AND ce.peer_raw IS NOT NULL
    """), {"case_id": case_id})
    db.commit()
    
    # Cross-source PHONE <-> ACCOUNT (±30 min)
    db.execute(text("""
        INSERT INTO entity_links (id, case_id, entity_a, entity_b, link_type, confidence, confidence_tier, evidence_event_ids)
        SELECT gen_random_uuid(), :case_id, e_phone.id, e_acc.id, 'FINANCIAL', 0.70, 'PROBABLE', jsonb_build_array(ce_phone.id, ce_acc.id)
        FROM canonical_events ce_phone
        JOIN canonical_events ce_acc ON ce_phone.case_id = ce_acc.case_id
        JOIN entities e_phone ON ce_phone.actor_entity_id = e_phone.id
        JOIN entities e_acc ON ce_acc.actor_entity_id = e_acc.id
        WHERE ce_phone.case_id = :case_id 
          AND ce_phone.event_type IN ('CALL', 'SMS', 'IPDR_SESSION')
          AND ce_acc.event_type = 'BANK_TRANSFER'
          AND ABS(EXTRACT(EPOCH FROM (ce_phone.ts_start - ce_acc.ts_start))) <= 1800
          AND e_phone.id != e_acc.id
        ON CONFLICT DO NOTHING
    """), {"case_id": case_id})
    db.commit()

    # Tower co-location (±30 min)
    db.execute(text("""
        INSERT INTO entity_links (id, case_id, entity_a, entity_b, link_type, confidence, confidence_tier, evidence_event_ids)
        SELECT gen_random_uuid(), :case_id, e1.id, e2.id, 'LOCATION', 0.70, 'PROBABLE', jsonb_build_array(ce1.id, ce2.id)
        FROM canonical_events ce1
        JOIN canonical_events ce2 ON ce1.case_id = ce2.case_id 
            AND ce1.location_raw = ce2.location_raw
            AND ABS(EXTRACT(EPOCH FROM (ce1.ts_start - ce2.ts_start))) <= 1800
        JOIN entities e1 ON ce1.actor_entity_id = e1.id
        JOIN entities e2 ON ce2.actor_entity_id = e2.id
        WHERE ce1.case_id = :case_id 
          AND ce1.location_raw IS NOT NULL
          AND e1.id < e2.id
        ON CONFLICT DO NOTHING
    """), {"case_id": case_id})
    db.commit()
    
    # IP session overlap (±15 min)
    db.execute(text("""
        INSERT INTO entity_links (id, case_id, entity_a, entity_b, link_type, confidence, confidence_tier, evidence_event_ids)
        SELECT gen_random_uuid(), :case_id, e1.id, e2.id, 'COMMS', 0.65, 'PROBABLE', jsonb_build_array(ce1.id, ce2.id)
        FROM canonical_events ce1
        JOIN canonical_events ce2 ON ce1.case_id = ce2.case_id 
            AND ce1.peer_raw = ce2.peer_raw
            AND ABS(EXTRACT(EPOCH FROM (ce1.ts_start - ce2.ts_start))) <= 900
        JOIN entities e1 ON ce1.actor_entity_id = e1.id
        JOIN entities e2 ON ce2.actor_entity_id = e2.id
        WHERE ce1.case_id = :case_id 
          AND ce1.event_type = 'IPDR_SESSION' AND ce2.event_type = 'IPDR_SESSION'
          AND ce1.peer_raw IS NOT NULL
          AND e1.id < e2.id
        ON CONFLICT DO NOTHING
    """), {"case_id": case_id})
    db.commit()
    
    # Detect contradictions
    contradictions = find_contradictions(db, case_id)
    
    # Count results
    entities_created = db.execute(text("SELECT COUNT(*) FROM entities WHERE case_id = :case_id"), {"case_id": case_id}).scalar()
    links_created = db.execute(text("SELECT COUNT(*) FROM entity_links WHERE case_id = :case_id"), {"case_id": case_id}).scalar()
    
    return {
        "entities_created": entities_created,
        "links_created": links_created,
        "contradictions": [c.to_dict() for c in contradictions]
    }
