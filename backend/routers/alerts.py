import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db

router = APIRouter()

@router.get("/cases/{case_id}/alerts")
def get_alerts(case_id: uuid.UUID, severity: Optional[str] = None, rule_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = """
        SELECT id, rule_id, severity, fraud_weight, confidence, 
               (fraud_weight * CASE WHEN confidence < 0.6 THEN 0.3 WHEN confidence < 0.9 THEN 0.7 ELSE 1.0 END) as effective_weight,
               jsonb_array_length(entity_ids) as entity_count,
               jsonb_array_length(event_ids) as event_count,
               SUBSTRING(explanation, 1, 200) as explanation,
               ml_signal, created_at
        FROM findings
        WHERE case_id = :case_id
    """
    params = {"case_id": case_id}
    if severity:
        query += " AND severity = :severity"
        params["severity"] = severity
    if rule_id:
        query += " AND rule_id = :rule_id"
        params["rule_id"] = rule_id
        
    query += " ORDER BY effective_weight DESC"
    
    rows = db.execute(text(query), params).fetchall()
    
    return [dict(r._mapping) for r in rows]

@router.get("/cases/{case_id}/alerts/{finding_id}")
def get_alert_detail(case_id: uuid.UUID, finding_id: uuid.UUID, db: Session = Depends(get_db)):
    f = db.execute(text("SELECT * FROM findings WHERE id = :finding_id AND case_id = :case_id"), {"finding_id": finding_id, "case_id": case_id}).fetchone()
    if not f:
        raise HTTPException(404, "Finding not found")
        
    f_dict = dict(f._mapping)
    f_dict['ml_explanation'] = "Anomalous transaction identified by Isolation Forest" if f.ml_signal > 0.6 else None
    
    # Entities
    if f.entity_ids:
        entities = db.execute(text("SELECT id, type, canonical_value, confidence_tier FROM entities WHERE id = ANY(:ids)"), {"ids": [uuid.UUID(e) for e in f.entity_ids]}).fetchall()
        f_dict['entities'] = [dict(e._mapping) for e in entities]
    else:
        f_dict['entities'] = []
        
    # Events
    if f.event_ids:
        events = db.execute(text("SELECT * FROM canonical_events WHERE id = ANY(:ids)"), {"ids": [uuid.UUID(e) for e in f.event_ids]}).fetchall()
        f_dict['events'] = [dict(e._mapping) for e in events]
    else:
        f_dict['events'] = []
        
    # Source Files
    if f.source_file_ids:
        files = db.execute(text("SELECT id, original_name, sha256, uploaded_at FROM raw_files WHERE id = ANY(:ids)"), {"ids": [uuid.UUID(sf) for sf in set(f.source_file_ids)]}).fetchall()
        f_dict['source_files'] = [dict(sf._mapping) for sf in files]
    else:
        f_dict['source_files'] = []
        
    # Episode
    f_dict['episode_summary'] = None
    if f.episode_id:
        ep = db.execute(text("SELECT summary FROM episodes WHERE id = :ep_id"), {"ep_id": f.episode_id}).fetchone()
        f_dict['episode_summary'] = ep.summary if ep else None
        
    return f_dict
