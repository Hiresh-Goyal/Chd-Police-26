import decimal

def to_float(val) -> float:
    """Safely convert Decimal, str, int, or float to Python float."""
    if val is None:
        return 0.0
    if isinstance(val, decimal.Decimal):
        return float(val)
    return float(val)

import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text
from collections import defaultdict
from datetime import datetime, timezone

def run_sim_011(db: Session, case_id: uuid.UUID) -> list[dict]:
    events = db.execute(text("""
        SELECT actor_raw, device_id, ts_start, id, source_file_id, source_row
        FROM canonical_events
        WHERE case_id = :cid AND event_type = 'CALL' AND device_id IS NOT NULL AND device_id != ''
        ORDER BY actor_raw, ts_start
    """), {"cid": str(case_id)}).fetchall()
    
    msisdn_devices = defaultdict(list)
    for ev in events:
        try:
            t = datetime.fromisoformat(str(ev['ts_start']).replace('Z', '+00:00'))
        except Exception:
            continue
            
        msisdn_devices[str(ev['actor_raw'])].append({
            'imei': str(ev['device_id']),
            'ts': t,
            'event_id': str(ev['id']),
            'source_file_id': str(ev['source_file_id']),
            'source_row': ev['source_row'],
        })
    
    findings = []
    for msisdn, device_uses in msisdn_devices.items():
        if len(device_uses) < 3:
            continue
        
        times = sorted([d['ts'] for d in device_uses])
        window_start = times[0]
        window_end = times[-1]
        
        if (window_end - window_start).days > 14:
            continue  # Spread over more than 14 days — not this rule
        
        unique_imeis = set(d['imei'] for d in device_uses)
        if len(unique_imeis) < 3:
            continue
        
        findings.append({
            'rule_id': 'SIM-011',
            'severity': 'HIGH',
            'fraud_weight': 18,
            'confidence': 0.85,
            'entity_ids': [],  # populated later or just handled by entity extraction
            'event_ids': [d['event_id'] for d in device_uses],
            'source_file_ids': list(set(d['source_file_id'] for d in device_uses)),
            'source_rows': [{'file_id': d['source_file_id'], 'row': d['source_row']} for d in device_uses],
            'explanation': (
                f"MSISDN {msisdn} was used on {len(unique_imeis)} different devices (IMEIs) "
                f"within {(window_end - window_start).days} days: {', '.join(list(unique_imeis)[:3])}. "
                f"This device-hopping pattern suggests physical SIM sharing or device-based fraud ring coordination. "
                f"Rule SIM-011 triggered."
            ),
        })
    
    return findings
