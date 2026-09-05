import uuid
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db

router = APIRouter()

@router.get("/cases/{case_id}/graph")
def get_graph(case_id: uuid.UUID, db: Session = Depends(get_db)):
    entities = db.execute(text("""
        SELECT id, type, canonical_value, confidence_tier, fraud_score_contribution, metadata, 
               jsonb_array_length(source_ids) as source_count
        FROM entities WHERE case_id = :case_id
    """), {"case_id": case_id}).fetchall()
    
    links = db.execute(text("""
        SELECT id, entity_a, entity_b, link_type, confidence, confidence_tier, evidence_event_ids
        FROM entity_links WHERE case_id = :case_id
    """), {"case_id": case_id}).fetchall()
    
    nodes = []
    for e in entities:
        role = e.metadata.get('role_signal', 'UNKNOWN') if e.metadata else 'UNKNOWN'
        struct_score = e.metadata.get('structural_anomaly_score', 0.0) if e.metadata else 0.0
        nodes.append({
            "id": str(e.id),
            "type": e.type,
            "canonical_value": e.canonical_value,
            "confidence_tier": e.confidence_tier,
            "fraud_score_contribution": e.fraud_score_contribution,
            "role_signal": role,
            "structural_anomaly_score": struct_score,
            "source_count": e.source_count,
            "metadata": e.metadata or {}
        })
        
    edges = []
    for l in links:
        edges.append({
            "id": str(l.id),
            "source": str(l.entity_a),
            "target": str(l.entity_b),
            "link_type": l.link_type,
            "confidence": l.confidence,
            "confidence_tier": l.confidence_tier,
            "evidence_event_ids": json.loads(l.evidence_event_ids) if isinstance(l.evidence_event_ids, str) else (l.evidence_event_ids or [])
        })
        
    return {"nodes": nodes, "edges": edges}
