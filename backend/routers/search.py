import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db

router = APIRouter()

@router.get("/cases/{case_id}/search")
def search(case_id: uuid.UUID, q: str = "", db: Session = Depends(get_db)):
    if not q:
        return {"entities": [], "events": [], "findings": []}
        
    query_str = f"%{q}%"
    
    entities = db.execute(text("""
        SELECT * FROM entities 
        WHERE case_id = :case_id AND canonical_value ILIKE :q
    """), {"case_id": case_id, "q": query_str}).fetchall()
    
    events = db.execute(text("""
        SELECT * FROM canonical_events 
        WHERE case_id = :case_id AND (actor_raw ILIKE :q OR peer_raw ILIKE :q)
        LIMIT 100
    """), {"case_id": case_id, "q": query_str}).fetchall()
    
    findings = db.execute(text("""
        SELECT * FROM findings 
        WHERE case_id = :case_id AND explanation ILIKE :q
    """), {"case_id": case_id, "q": query_str}).fetchall()
    
    return {
        "entities": [dict(r._mapping) for r in entities],
        "events": [dict(r._mapping) for r in events],
        "findings": [dict(r._mapping) for r in findings]
    }
