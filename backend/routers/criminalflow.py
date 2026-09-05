import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db

router = APIRouter()

@router.get("/cases/{case_id}/criminalflow")
def get_criminal_flow(case_id: uuid.UUID, db: Session = Depends(get_db)):
    # Build from BANK_TRANSFER events
    events = db.execute(text("""
        SELECT id, ts_start, amount, actor_raw as sender, peer_raw as receiver, source_file_id, source_row
        FROM canonical_events
        WHERE case_id = :case_id AND event_type = 'BANK_TRANSFER'
    """), {"case_id": case_id}).fetchall()
    
    # We will determine roles manually or load from entities if available.
    # We load roles from entities:
    entities = db.execute(text("""
        SELECT canonical_value, metadata->>'role_signal' as role_signal
        FROM entities WHERE case_id = :case_id AND type = 'ACCOUNT'
    """), {"case_id": case_id}).fetchall()
    
    role_map = {e.canonical_value: e.role_signal for e in entities}
    
    nodes_dict = {}
    edges = []
    
    for ev in events:
        s = ev.sender
        r = ev.receiver
        amt = float(ev.amount) if ev.amount else 0.0
        
        if s not in nodes_dict:
            nodes_dict[s] = {"id": s, "entity_type": "ACCOUNT", "role": role_map.get(s, "UNKNOWN"), "canonical_value": s, "total_received": 0, "total_sent": 0}
        if r not in nodes_dict:
            nodes_dict[r] = {"id": r, "entity_type": "ACCOUNT", "role": role_map.get(r, "UNKNOWN"), "canonical_value": r, "total_received": 0, "total_sent": 0}
            
        nodes_dict[s]["total_sent"] += amt
        nodes_dict[r]["total_received"] += amt
        
        edges.append({
            "source": s,
            "target": r,
            "amount": amt,
            "timestamp": ev.ts_start.isoformat(),
            "canonical_event_id": str(ev.id),
            "source_file_id": str(ev.source_file_id),
            "source_row": ev.source_row
        })
        
    return {"nodes": list(nodes_dict.values()), "edges": edges}
