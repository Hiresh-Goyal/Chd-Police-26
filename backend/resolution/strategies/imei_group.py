import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text

def group_imei(db: Session, case_id: uuid.UUID) -> dict:
    # Link phone entities that share an IMEI
    
    sql_links = text("""
        INSERT INTO entity_links (id, case_id, entity_a, entity_b, link_type, confidence, confidence_tier, evidence_event_ids)
        SELECT gen_random_uuid(), :case_id, e1.id, e2.id, 'SAME_DEVICE', 0.92, 'CONFIRMED',
               jsonb_build_array(ce1.id, ce2.id)
        FROM canonical_events ce1
        JOIN canonical_events ce2 ON ce1.case_id = ce2.case_id AND ce1.device_id = ce2.device_id
        JOIN entities e1 ON ce1.actor_entity_id = e1.id
        JOIN entities e2 ON ce2.actor_entity_id = e2.id
        WHERE ce1.case_id = :case_id 
          AND ce1.device_id IS NOT NULL 
          AND e1.id < e2.id
        ON CONFLICT DO NOTHING
    """)
    db.execute(sql_links, {"case_id": case_id})
    db.commit()
    return {"status": "ok"}
