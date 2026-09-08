from dataclasses import dataclass, field
from typing import List

@dataclass
class FindingResult:
    rule_id: str
    severity: str # CRITICAL | HIGH | MEDIUM | LOW
    weight: int
    confidence: float
    entity_ids: List[str]
    event_ids: List[str]
    source_file_ids: List[str]
    source_rows: List[int]
    explanation: str # human-readable, template-generated

@dataclass
class DetectionResult:
    case_id: str
    findings: List[FindingResult] = field(default_factory=list)
    episodes_created: int = 0
    fraud_score: int = 0
    risk_level: str = 'LOW'

def run_detection(case_id: str) -> DetectionResult:
    """
    Orchestrates: build_episodes -> run all 8 rules -> compute_fraud_score 
    -> generate narratives -> write findings, episodes, fraud_scores to DB.
    Returns DetectionResult.
    """
    from backend.db.connection import get_connection
    from backend.detection.episodes import build_episodes
    from backend.detection.score import compute_fraud_score
    from backend.detection.rules import run_all_rules
    from backend.shared.schema import findings, episodes as episodes_tbl, fraud_scores
    
    try:
        with get_connection() as conn:
            # 1. Build Episodes
            eps = build_episodes(conn, case_id)
            if eps:
                conn.execute(episodes_tbl.insert(), eps)
            
            # 2. Run Rules
            all_findings = run_all_rules(conn, case_id)
            
            # 3. Compute FraudScore
            fs_result = compute_fraud_score(case_id, all_findings)
            
            # 4. Write findings to DB
            if all_findings:
                findings_data = []
                import uuid
                import json
                from datetime import datetime
                now_str = datetime.utcnow().isoformat() + "Z"
                for f in all_findings:
                    findings_data.append({
                        "id": str(uuid.uuid4()),
                        "case_id": case_id,
                        "rule_id": f.rule_id,
                        "severity": f.severity,
                        "fraud_weight": f.weight,
                        "confidence": f.confidence,
                        "explanation": f.explanation,
                        "entity_ids": json.dumps(list(f.entity_ids)),
                        "event_ids": json.dumps(list(f.event_ids)),
                        "source_file_ids": json.dumps(list(f.source_file_ids)),
                        "source_rows": json.dumps(list(f.source_rows)),
                        "created_at": now_str
                    })
                conn.execute(findings.insert(), findings_data)
                
            # 5. Write fraud score to DB
            # Upsert or insert depending on DB. We'll delete and insert.
            conn.execute(fraud_scores.delete().where(fraud_scores.c.case_id == case_id))
            
            top_fs = []
            breakdown = {}
            for f in fs_result.top_findings:
                tf = vars(f).copy()
                tf["entity_ids"] = list(tf["entity_ids"])
                tf["event_ids"] = list(tf["event_ids"])
                tf["source_file_ids"] = list(tf["source_file_ids"])
                tf["source_rows"] = list(tf["source_rows"])
                top_fs.append(tf)
                breakdown[f.rule_id] = f.weight
                
            import json
            import uuid
            from datetime import datetime
            
            conn.execute(fraud_scores.insert().values(
                id=str(uuid.uuid4()),
                case_id=case_id,
                score=fs_result.score,
                risk_level=fs_result.risk_level,
                findings_breakdown=json.dumps(breakdown),
                top_findings=json.dumps(top_fs),
                total_findings=fs_result.total_findings,
                computed_at=datetime.utcnow().isoformat() + "Z"
            ))
            
    except Exception as e:
        print(f"Error in detection: {e}")
        raise

    return DetectionResult(
        case_id=case_id,
        findings=all_findings,
        episodes_created=len(eps),
        fraud_score=fs_result.score,
        risk_level=fs_result.risk_level
    )
