import uuid
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db

router = APIRouter()

@router.get("/cases/{case_id}/timeline")
def get_timeline(
    case_id: uuid.UUID,
    entity_id: Optional[str] = None,
    event_type: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query_str = """
        SELECT ce.id, ce.event_type, ce.ts_start, ce.ts_end,
               ce.actor_entity_id, ce.actor_raw, e_actor.confidence_tier as actor_confidence_tier,
               ce.peer_entity_id, ce.peer_raw, e_peer.confidence_tier as peer_confidence_tier,
               ce.amount, ce.location_raw, ce.device_id,
               ce.source_file_id, rf.original_name as source_file_name, ce.source_row,
               ce.episode_id, ep.label as episode_label, ce.payload
        FROM canonical_events ce
        LEFT JOIN entities e_actor ON ce.actor_entity_id = e_actor.id
        LEFT JOIN entities e_peer ON ce.peer_entity_id = e_peer.id
        LEFT JOIN raw_files rf ON ce.source_file_id = rf.id
        LEFT JOIN episodes ep ON ce.episode_id = ep.id
        WHERE ce.case_id = :case_id
    """
    params = {"case_id": case_id}
    
    if entity_id:
        query_str += " AND (ce.actor_entity_id = :ent_id OR ce.peer_entity_id = :ent_id)"
        params["ent_id"] = entity_id
    if event_type:
        query_str += " AND ce.event_type = :event_type"
        params["event_type"] = event_type
    if start:
        query_str += " AND ce.ts_start >= :start"
        params["start"] = start
    if end:
        query_str += " AND ce.ts_start <= :end"
        params["end"] = end
        
    query_str += " ORDER BY ce.ts_start ASC LIMIT 1000"
    
    rows = db.execute(text(query_str), params).fetchall()
    
    result = []
    for r in rows:
        result.append({
            "id": str(r.id),
            "event_type": r.event_type,
            "ts_start": r.ts_start.isoformat() if r.ts_start else None,
            "ts_end": r.ts_end.isoformat() if r.ts_end else None,
            "actor_entity_id": str(r.actor_entity_id) if r.actor_entity_id else None,
            "actor_raw": r.actor_raw,
            "actor_confidence_tier": r.actor_confidence_tier,
            "peer_entity_id": str(r.peer_entity_id) if r.peer_entity_id else None,
            "peer_raw": r.peer_raw,
            "peer_confidence_tier": r.peer_confidence_tier,
            "amount": float(r.amount) if r.amount else None,
            "location_raw": r.location_raw,
            "device_id": r.device_id,
            "source_file_id": str(r.source_file_id) if r.source_file_id else None,
            "source_file_name": r.source_file_name,
            "source_row": r.source_row,
            "episode_id": str(r.episode_id) if r.episode_id else None,
            "episode_label": r.episode_label,
            "payload": r.payload
        })
    return result
