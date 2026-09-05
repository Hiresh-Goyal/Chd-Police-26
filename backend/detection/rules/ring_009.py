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

def check_fraud_rings(fraud_rings: list[dict]) -> list[dict]:
    findings = []
    for ring in fraud_rings:
        if ring['size'] < 3 or not ring['high_risk_entities']:
            continue
        
        findings.append({
            'rule_id': 'RING-009',
            'severity': 'CRITICAL' if ring['size'] >= 5 else 'HIGH',
            'weight': ring['ring_finding_weight'],
            'confidence': ring['ring_confidence'],
            'entity_ids': ring['entity_ids'],
            'event_ids': [],
            'source_file_ids': [],
            'source_rows': [],
            'explanation': ring['explanation'],
            'ml_signal': ring['density'],
        })
    return findings
