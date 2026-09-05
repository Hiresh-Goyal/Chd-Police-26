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
import pandas as pd

def run_fsm_005(db: Session, case_id: uuid.UUID) -> List[Dict[str, Any]]:
    query = text("""
        WITH first_seen_phone AS (
            SELECT actor_raw as phone, MIN(ts_start) as first_seen
            FROM canonical_events
            WHERE case_id = :case_id AND event_type IN ('CALL', 'SMS')
            GROUP BY actor_raw
        ),
        first_transfer AS (
            SELECT actor_raw as phone, MIN(ts_start) as first_transfer,
                   array_agg(DISTINCT id) as ev_ids, array_agg(DISTINCT source_file_id) as sf_ids
            FROM canonical_events
            WHERE case_id = :case_id AND event_type = 'BANK_TRANSFER'
            GROUP BY actor_raw
        )
        SELECT fsp.phone, fsp.first_seen, ft.first_transfer, ft.ev_ids, ft.sf_ids,
               EXTRACT(DAY FROM (ft.first_transfer - fsp.first_seen)) as days_diff
        FROM first_seen_phone fsp
        JOIN first_transfer ft ON fsp.phone = ft.phone
        WHERE EXTRACT(DAY FROM (ft.first_transfer - fsp.first_seen)) < 7
          AND ft.first_transfer > fsp.first_seen
    """)
    rows = db.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        f = {
            "rule_id": "FSM-005",
            "severity": "MEDIUM",
            "fraud_weight": 18,
            "confidence": 0.9,
            "entity_ids": [],
            "event_ids": [str(x) for x in r.ev_ids],
            "source_file_ids": [str(x) for x in r.sf_ids],
            "source_rows": [],
            "template_data": {
                "msisdn": r.phone,
                "first_seen": str(r.first_seen.date()),
                "first_transfer": str(r.first_transfer.date()),
                "days": int(r.days_diff)
            }
        }
        findings.append(f)
    return findings
