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

def run_amt_006(db: Session, case_id: uuid.UUID) -> List[Dict[str, Any]]:
    query = text("""
        SELECT actor_raw, COUNT(*) as transfer_count, 
               array_agg(amount) as amounts,
               array_agg(id) as ev_ids,
               array_agg(source_file_id) as sf_ids,
               array_agg(source_row) as s_rows
        FROM canonical_events
        WHERE case_id = :case_id AND event_type = 'BANK_TRANSFER'
          AND amount >= 9000 AND amount <= 9999
        GROUP BY actor_raw
        HAVING COUNT(*) >= 3
    """)
    rows = db.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        f = {
            "rule_id": "AMT-006",
            "severity": "MEDIUM",
            "fraud_weight": 15,
            "confidence": 0.9,
            "entity_ids": [],
            "event_ids": [str(x) for x in r.ev_ids],
            "source_file_ids": [str(x) for x in r.sf_ids],
            "source_rows": [{"file_id": str(sf), "row": int(sr)} for sf, sr in zip(r.sf_ids, r.s_rows)],
            "template_data": {
                "source": r.actor_raw,
                "transfer_count": r.transfer_count,
                "amounts": ", ".join([str(to_float(a)) for a in r.amounts])
            }
        }
        findings.append(f)
    return findings
