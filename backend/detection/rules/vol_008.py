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
import numpy as np

def run_vol_008(db: Session, case_id: uuid.UUID) -> List[Dict[str, Any]]:
    query = text("""
        SELECT actor_raw, ts_start, id
        FROM canonical_events
        WHERE case_id = :case_id AND event_type = 'CALL'
    """)
    rows = db.execute(query, {"case_id": case_id}).fetchall()
    if not rows:
        return []
        
    df = pd.DataFrame(rows, columns=['actor_raw', 'ts_start', 'id'])
    df['ts_start'] = pd.to_datetime(df['ts_start'])
    
    findings = []
    for actor, group in df.groupby('actor_raw'):
        group = group.set_index('ts_start')
        hourly = group.resample('1H').size()
        
        if len(hourly) > 2:
            mean = hourly.mean()
            std = hourly.std()
            if std > 0:
                z_scores = (hourly - mean) / std
                peaks = z_scores[z_scores > 2.5]
                for ts, z in peaks.items():
                    peak_count = hourly[ts]
                    f = {
                        "rule_id": "VOL-008",
                        "severity": "MEDIUM",
                        "fraud_weight": 15,
                        "confidence": 0.9,
                        "entity_ids": [],
                        "event_ids": [],
                        "source_file_ids": [],
                        "source_rows": [],
                        "template_data": {
                            "entity": actor,
                            "peak_count": int(peak_count),
                            "hour_start": ts.strftime('%H:%M'),
                            "hour_end": (ts + pd.Timedelta(hours=1)).strftime('%H:%M'),
                            "z": to_float(z),
                            "mean": to_float(mean),
                            "std": to_float(std)
                        }
                    }
                    findings.append(f)
    return findings
