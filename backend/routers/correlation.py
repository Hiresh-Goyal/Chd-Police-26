import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db

router = APIRouter()

@router.get("/cases/{case_id}/correlation-matrix")
def get_correlation_matrix(case_id: uuid.UUID, db: Session = Depends(get_db)):
    entities = db.execute(text("""
        SELECT id, canonical_value, confidence_tier 
        FROM entities 
        WHERE case_id = :case_id
        ORDER BY canonical_value
    """), {"case_id": case_id}).fetchall()
    
    # We find which sources an entity appears in by joining canonical events with raw_files
    # Actually, entities already have source_ids which we can map back to file_types
    # Let's do it via canonical_events for exact mapping
    entity_source_map = db.execute(text("""
        SELECT ce.actor_entity_id, rf.file_type
        FROM canonical_events ce
        JOIN raw_files rf ON ce.source_file_id = rf.id
        WHERE ce.case_id = :case_id AND ce.actor_entity_id IS NOT NULL
        GROUP BY ce.actor_entity_id, rf.file_type
    """), {"case_id": case_id}).fetchall()
    
    source_mapping = {}
    for r in entity_source_map:
        if r.actor_entity_id not in source_mapping:
            source_mapping[r.actor_entity_id] = set()
        source_mapping[r.actor_entity_id].add(r.file_type)
        
    sources = ['CDR', 'BANK', 'IPDR', 'SOCIAL']
    
    matrix = []
    entity_list = []
    
    for e in entities:
        entity_list.append({"id": str(e.id), "canonical_value": e.canonical_value, "confidence_tier": e.confidence_tier})
        row = []
        for s in sources:
            if e.id in source_mapping and s in source_mapping[e.id]:
                row.append(e.confidence_tier)
            else:
                row.append(None)
        matrix.append(row)
        
    return {
        "entities": entity_list,
        "sources": sources,
        "matrix": matrix
    }
