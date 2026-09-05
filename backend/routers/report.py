import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.responses import JSONResponse

from db.connection import get_db
from routers.cases import get_case
from routers.timeline import get_timeline
from routers.alerts import get_alerts, get_alert_detail
from routers.score import get_fraud_score
from routers.criminalflow import get_criminal_flow
from routers.entities import get_entities

router = APIRouter()

@router.get("/cases/{case_id}/report")
def get_report(case_id: uuid.UUID, format: str = 'json', db: Session = Depends(get_db)):
    case_data = get_case(case_id, db)
    fraud_score = get_fraud_score(case_id, db)
    timeline = get_timeline(case_id, db=db)[:50]
    entities = get_entities(case_id, db)
    alerts = get_alerts(case_id, db=db)
    money_flow = get_criminal_flow(case_id, db)
    
    # Add detailed alerts
    findings = []
    for a in alerts:
        findings.append(get_alert_detail(case_id, uuid.UUID(str(a['id'])), db))
        
    raw_files = db.execute(text("SELECT id, original_name, sha256, uploaded_at, events_created FROM raw_files WHERE case_id = :case_id"), {"case_id": case_id}).fetchall()
    
    res = {
        "case": case_data,
        "summary": {
            "total_events": sum(f.events_created for f in raw_files),
            "total_entities": len(entities),
            "total_findings": len(findings),
            "fraud_score": fraud_score["score"],
            "risk_level": fraud_score["risk_level"],
            "data_sources": ["CDR", "BANK", "IPDR", "SOCIAL"],
            "investigation_period": {"start": None, "end": None} # simplified
        },
        "timeline": timeline,
        "entity_summary": entities,
        "findings": findings,
        "money_flow": money_flow,
        "ml_signals": fraud_score.get("ml_anomaly_summary", {}),
        "chain_of_custody": [{"file_id": str(f.id), "original_name": f.original_name, "sha256": f.sha256, "uploaded_at": f.uploaded_at.isoformat(), "events_created": f.events_created} for f in raw_files],
        "methodology": "DigitalSentinel v1.0 — 8 deterministic rules + ML anomaly layer"
    }
    
    if format == 'pdf':
        # Generating PDF using reportlab requires more setup and saving to file.
        # As a placeholder for Hackathon we can return an error or basic text if requested.
        return {"error": "PDF generation not implemented yet."}
        
    return JSONResponse(res)
