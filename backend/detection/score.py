from dataclasses import dataclass
from typing import List
from backend.detection.engine import FindingResult

@dataclass
class FraudScoreResult:
    score: int
    risk_level: str
    top_findings: List[FindingResult] # top 3 by weight*confidence
    total_findings: int

def compute_fraud_score(case_id: str, findings: List[FindingResult]) -> FraudScoreResult:
    """
    Apply confidence multiplier, de-duplicate findings with >80% shared event_ids (keep higher weight),
    sum weights, cap at 100.
    """
    # 1. Sort by weight*confidence desc
    for f in findings:
        # We assume f.confidence is already set based on entity links
        # But we can also cap or scale it here
        pass
        
    findings_sorted = sorted(findings, key=lambda x: x.weight * x.confidence, reverse=True)
    
    # 2. De-duplicate based on shared event_ids > 80%
    kept_findings = []
    for f in findings_sorted:
        is_dup = False
        f_events = set(f.event_ids)
        for kf in kept_findings:
            kf_events = set(kf.event_ids)
            union_len = len(f_events.union(kf_events))
            if union_len == 0:
                continue
            intersection_len = len(f_events.intersection(kf_events))
            if intersection_len / union_len > 0.8:
                is_dup = True
                break
        if not is_dup:
            kept_findings.append(f)
            
    # 3. Sum weights
    total_score = sum(f.weight * f.confidence for f in kept_findings)
    final_score = min(int(total_score), 100)
    
    # 4. Risk Level
    if final_score >= 80:
        risk_level = 'CRITICAL'
    elif final_score >= 60:
        risk_level = 'HIGH'
    elif final_score >= 40:
        risk_level = 'MEDIUM'
    else:
        risk_level = 'LOW'
        
    return FraudScoreResult(
        score=final_score,
        risk_level=risk_level,
        top_findings=kept_findings[:3],
        total_findings=len(kept_findings)
    )
