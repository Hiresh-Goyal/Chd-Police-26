import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db

router = APIRouter()

@router.get("/cases/{case_id}/fraudscore")
def get_fraud_score(case_id: uuid.UUID, db: Session = Depends(get_db)):
    score = db.execute(text("SELECT * FROM fraud_scores WHERE case_id = :case_id"), {"case_id": case_id}).fetchone()
    if not score:
        # Default or compute on the fly if not exists
        return {
            "score": 0, "risk_level": "LOW", "top_findings": [], 
            "total_findings": 0, "findings_breakdown": {}, "ml_anomaly_summary": {},
            "computed_at": None
        }
    
    import json
    res = dict(score._mapping)
    for field in ['top_findings', 'findings_breakdown', 'ml_anomaly_summary']:
        if isinstance(res.get(field), str):
            try:
                res[field] = json.loads(res[field])
            except Exception:
                pass
    return res
