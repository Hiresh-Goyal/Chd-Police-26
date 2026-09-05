import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db
from tower_lookup import lookup

router = APIRouter()

@router.get("/cases/{case_id}/geospatial")
def get_geospatial(case_id: uuid.UUID, db: Session = Depends(get_db)):
    events = db.execute(text("""
        SELECT ce.id, ce.event_type, ce.ts_start, ce.location_raw, ce.actor_entity_id, ce.actor_raw, e.confidence_tier
        FROM canonical_events ce
        LEFT JOIN entities e ON ce.actor_entity_id = e.id
        WHERE ce.case_id = :case_id AND ce.location_raw IS NOT NULL
          AND ce.event_type IN ('CALL', 'SMS', 'LOCATION_PING')
    """), {"case_id": case_id}).fetchall()
    
    results = []
    for ev in events:
        loc = lookup(ev.location_raw)
        if loc:
            results.append({
                "event_id": str(ev.id),
                "event_type": ev.event_type,
                "ts_start": ev.ts_start.isoformat() if ev.ts_start else None,
                "lat": loc['lat'],
                "lng": loc['lng'],
                "entity_id": str(ev.actor_entity_id) if ev.actor_entity_id else None,
                "confidence_tier": ev.confidence_tier,
                "actor_raw": ev.actor_raw
            })
            
    return results
