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

def run_amt_010(db: Session, case_id: uuid.UUID) -> list[dict]:
    events = db.execute(text("""
        SELECT id, actor_entity_id, peer_entity_id, actor_raw, amount, ts_start,
               source_file_id, source_row
        FROM canonical_events
        WHERE case_id = :cid AND event_type = 'BANK_TRANSFER' AND amount IS NOT NULL
    """), {"cid": str(case_id)}).fetchall()
    
    findings = []
    actor_suspicious = {}
    
    for ev in events:
        amount = to_float(ev['amount'])
        # Check if the amount ends in 97-99 or 01-03 (avoiding round numbers)
        remainder = int(amount) % 100
        if (97 <= remainder <= 99) or (1 <= remainder <= 3):
            actor = str(ev['actor_entity_id'] or ev['actor_raw'] or '')
            if actor not in actor_suspicious:
                actor_suspicious[actor] = []
            actor_suspicious[actor].append(dict(ev))
    
    for actor, suspicious_events in actor_suspicious.items():
        if len(suspicious_events) >= 3:
            amounts = [to_float(e['amount']) for e in suspicious_events]
            event_ids = [str(e['id']) for e in suspicious_events]
            source_rows = [{'file_id': str(e['source_file_id']), 'row': e['source_row']} 
                          for e in suspicious_events]
            
            # Identify entity UUID if we resolved it
            entity_ids = []
            if len(actor) == 36 and actor.count('-') == 4:
                entity_ids.append(actor)
            
            findings.append({
                'rule_id': 'AMT-010',
                'severity': 'MEDIUM',
                'fraud_weight': 12,
                'confidence': 0.80,
                'entity_ids': entity_ids,
                'event_ids': event_ids,
                'source_file_ids': list(set(str(e['source_file_id']) for e in suspicious_events)),
                'source_rows': source_rows,
                'explanation': (
                    f"Entity made {len(suspicious_events)} transfers with amounts ending in "
                    f"97–99 or 01–03 (e.g., ₹{amounts[0]:,.0f}, ₹{amounts[1]:,.0f}). "
                    f"This pattern of deliberately non-round amounts is associated with "
                    f"manual structuring to avoid round-number detection systems. "
                    f"Rule AMT-010 triggered."
                ),
            })
    return findings
