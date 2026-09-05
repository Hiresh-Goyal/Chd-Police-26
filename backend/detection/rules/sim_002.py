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

def run_sim_002(db: Session, case_id: uuid.UUID) -> List[Dict[str, Any]]:
    query = text("""
        SELECT device_id, actor_raw as msisdn, ts_start, id, source_file_id, source_row
        FROM canonical_events
        WHERE case_id = :case_id AND device_id IS NOT NULL AND event_type IN ('CALL', 'SMS')
    """)
    rows = db.execute(query, {"case_id": case_id}).fetchall()
    if not rows:
        return []
        
    df = pd.DataFrame(rows, columns=['device_id', 'msisdn', 'ts_start', 'id', 'source_file_id', 'source_row'])
    df['ts_start'] = pd.to_datetime(df['ts_start'])
    
    findings = []
    for imei, group in df.groupby('device_id'):
        group = group.sort_values('ts_start')
        # Check rolling 7 days for >= 3 unique msisdns
        for i in range(len(group)):
            start_ts = group.iloc[i]['ts_start']
            end_ts = start_ts + pd.Timedelta(days=7)
            window = group[(group['ts_start'] >= start_ts) & (group['ts_start'] <= end_ts)]
            unique_msisdns = window['msisdn'].unique()
            if len(unique_msisdns) >= 3:
                # Found
                event_ids = window['id'].astype(str).tolist()
                sf_ids = window['source_file_id'].astype(str).tolist()
                s_rows = [{"file_id": str(sf), "row": int(sr)} for sf, sr in zip(window['source_file_id'], window['source_row'])]
                
                f = {
                    "rule_id": "SIM-002",
                    "severity": "HIGH",
                    "fraud_weight": 20,
                    "confidence": 0.9,
                    "entity_ids": [],
                    "event_ids": event_ids,
                    "source_file_ids": list(set(sf_ids)),
                    "source_rows": s_rows,
                    "template_data": {
                        "imei": str(imei),
                        "msisdn_count": len(unique_msisdns),
                        "date_range": f"{start_ts.date()} to {end_ts.date()}",
                        "msisdn_list": ", ".join(unique_msisdns),
                        "evidence": f"{len(event_ids)} CDR events"
                    }
                }
                findings.append(f)
                break # break to avoid reporting same window multiple times
    return findings
