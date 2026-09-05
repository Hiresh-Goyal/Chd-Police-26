import uuid
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from shared.schema import fraud_scores

def compute_fraud_score(db: Session, case_id: uuid.UUID) -> Dict[str, Any]:
    # 1. Collect findings
    query = text("""
        SELECT id, rule_id, severity, fraud_weight, confidence, ml_signal, event_ids
        FROM findings
        WHERE case_id = :case_id
    """)
    rows = db.execute(query, {"case_id": case_id}).fetchall()
    
    if not rows:
        return {
            "score": 0, "risk_level": "LOW", "top_findings": [], 
            "total_findings": 0, "findings_breakdown": {}, "ml_anomaly_summary": {}
        }
    
    # Deduplication and Scoring
    processed_findings = []
    seen_events = set()
    
    for r in sorted(rows, key=lambda x: (x.fraud_weight + (min(5, x.fraud_weight * 0.15) if x.ml_signal > 0.6 else 0)), reverse=True):
        ev_set = set(r.event_ids)
        
        # If >80% overlap with already seen, skip to deduplicate
        overlap = len(ev_set.intersection(seen_events))
        if len(ev_set) > 0 and (overlap / len(ev_set)) > 0.8:
            continue
            
        seen_events.update(ev_set)
        
        # 2. Confidence multiplier
        # 0.95 -> CONFIRMED (1.0), 0.75 -> PROBABLE (0.7), <0.6 -> CANDIDATE (0.3)
        multiplier = 1.0
        if r.confidence < 0.6:
            multiplier = 0.3
        elif r.confidence < 0.9:
            multiplier = 0.7
            
        effective_weight = r.fraud_weight * multiplier
        
        # 3. ML Boost
        ml_boost = 0
        if r.ml_signal > 0.6:
            ml_boost = min(5, r.fraud_weight * 0.15)
            
        effective_weight += ml_boost
        
        processed_findings.append({
            "id": str(r.id),
            "rule_id": r.rule_id,
            "severity": r.severity,
            "fraud_weight": r.fraud_weight,
            "confidence": r.confidence,
            "effective_weight": effective_weight,
            "ml_signal": r.ml_signal
        })

    # 5. Sum
    score_raw = sum(f['effective_weight'] for f in processed_findings)
    
    # 6. Normalize
    score = min(100, int(score_raw))
    
    # 7. Risk level
    if score >= 80:
        risk = 'CRITICAL'
    elif score >= 60:
        risk = 'HIGH'
    elif score >= 40:
        risk = 'MEDIUM'
    else:
        risk = 'LOW'
        
    # Breakdown
    breakdown = {}
    for f in processed_findings:
        if f['rule_id'] not in breakdown:
            breakdown[f['rule_id']] = {"count": 0, "total_weight": 0.0}
        breakdown[f['rule_id']]['count'] += 1
        breakdown[f['rule_id']]['total_weight'] += f['effective_weight']
        
    top_findings = sorted(processed_findings, key=lambda x: x['effective_weight'], reverse=True)[:3]
    
    # ML Summary
    ml_flags = sum(1 for f in processed_findings if f['ml_signal'] > 0.6)
    ml_summary = {
        "isolation_forest_flags": ml_flags, # Simplification
        "velocity_alerts": ml_flags,
        "structural_anomalies": 0,
        "interpretation": f"ML detected {ml_flags} anomalous signals boosting the overall score."
    }
    
    import json
    
    result = {
        "id": str(uuid.uuid4()),
        "case_id": str(case_id),
        "score": score,
        "risk_level": risk,
        "findings_breakdown": json.dumps(breakdown),
        "top_findings": json.dumps(top_findings),
        "total_findings": len(processed_findings),
        "ml_anomaly_summary": json.dumps(ml_summary),
        "computed_at": datetime.now(timezone.utc)
    }
    
    # Upsert
    db.execute(text("DELETE FROM fraud_scores WHERE case_id = :case_id"), {"case_id": str(case_id)})
    db.execute(fraud_scores.insert().values(**result))
    db.commit()
    
    result['findings_breakdown'] = breakdown
    result['top_findings'] = top_findings
    result['ml_anomaly_summary'] = ml_summary
    
    # Need to convert UUIDs to string for JSON serialization
    result['id'] = str(result['id'])
    result['case_id'] = str(result['case_id'])
    
    return result
