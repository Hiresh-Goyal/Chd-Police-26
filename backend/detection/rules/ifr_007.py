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

def run_ifr_007(db: Session, case_id: uuid.UUID) -> List[Dict[str, Any]]:
    query = text("""
        SELECT ce1.id as call_id, ce2.id as ipdr_id,
               ce1.actor_raw as entity, ce2.peer_raw as ip,
               ce2.payload->>'dst_port' as port,
               ce1.ts_start as call_time,
               ce1.source_file_id as call_sf, ce1.source_row as call_sr,
               ce2.source_file_id as ipdr_sf, ce2.source_row as ipdr_sr
        FROM canonical_events ce1
        JOIN canonical_events ce2 ON ce1.case_id = ce2.case_id
        WHERE ce1.case_id = :case_id
          AND ce1.event_type = 'CALL'
          AND ce2.event_type = 'IPDR_SESSION'
          AND ce1.actor_raw = ce2.actor_raw
          AND ce2.payload->>'dst_port' = '5060'
          AND ce2.ts_start <= ce1.ts_start + INTERVAL '15 minutes'
          AND ce2.ts_end >= ce1.ts_start - INTERVAL '15 minutes'
    """)
    rows = db.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        f = {
            "rule_id": "IFR-007",
            "severity": "HIGH",
            "fraud_weight": 20,
            "confidence": 0.95,
            "entity_ids": [],
            "event_ids": [str(r.call_id), str(r.ipdr_id)],
            "source_file_ids": [str(r.call_sf), str(r.ipdr_sf)],
            "source_rows": [{"file_id": str(r.call_sf), "row": r.call_sr}, {"file_id": str(r.ipdr_sf), "row": r.ipdr_sr}],
            "template_data": {
                "entity": r.entity,
                "ip": r.ip,
                "port": r.port,
                "call_time": str(r.call_time),
                "overlap_sec": 0, # simplified
                "evidence": f"CDR row {r.call_sr}, IPDR row {r.ipdr_sr}"
            }
        }
        findings.append(f)
    return findings
