import decimal

def to_float(val) -> float:
    """Safely convert Decimal, str, int, or float to Python float."""
    if val is None:
        return 0.0
    if isinstance(val, decimal.Decimal):
        return float(val)
    return float(val)

import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

def run_ctn_001(db: Session, case_id: uuid.UUID) -> List[Dict[str, Any]]:
    query = text("""
        SELECT ce1.id as call_id, ce2.id as transfer_id,
               ce1.actor_raw as caller, ce1.peer_raw as victim,
               ce1.ts_start as call_time, ce2.ts_start as transfer_time,
               ce2.amount, 
               EXTRACT(EPOCH FROM (ce2.ts_start - ce1.ts_start))/60 as delta_min,
               ce1.source_file_id as call_sf, ce1.source_row as call_sr,
               ce2.source_file_id as trans_sf, ce2.source_row as trans_sr,
               ce1.actor_entity_id as entity_a, ce1.peer_entity_id as entity_b
        FROM canonical_events ce1
        JOIN canonical_events ce2 ON ce2.case_id = ce1.case_id
        WHERE ce1.case_id = :case_id
          AND ce1.event_type = 'CALL'
          AND ce2.event_type = 'BANK_TRANSFER'
          AND ce2.ts_start >= ce1.ts_start 
          AND ce2.ts_start <= ce1.ts_start + INTERVAL '30 minutes'
          AND (ce2.actor_entity_id = ce1.peer_entity_id OR ce2.peer_entity_id = ce1.peer_entity_id)
    """)
    rows = db.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        f = {
            "rule_id": "CTN-001",
            "severity": "HIGH",
            "fraud_weight": 25,
            "confidence": 0.95,  # simplified
            "entity_ids": [str(r.entity_a), str(r.entity_b)] if r.entity_a and r.entity_b else [],
            "event_ids": [str(r.call_id), str(r.transfer_id)],
            "source_file_ids": [str(r.call_sf), str(r.trans_sf)],
            "source_rows": [{"file_id": str(r.call_sf), "row": r.call_sr}, {"file_id": str(r.trans_sf), "row": r.trans_sr}],
            "template_data": {
                "ts_start": str(r.call_time),
                "ts_end": str(r.transfer_time),
                "actor_id": r.caller,
                "peer_id": r.victim,
                "transfer_count": 1,
                "total_amount": to_float(r.amount) if r.amount else 0,
                "delta_min": round(r.delta_min, 1),
                "tier": "CONFIRMED",
                "evidence": f"CDR row {r.call_sr}, Bank row {r.trans_sr}"
            }
        }
        findings.append(f)
    return findings
