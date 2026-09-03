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
    from backend.db.connection import get_db
    from backend.detection.episodes import build_episodes
    from backend.detection.score import compute_fraud_score
    from backend.detection.rules import run_all_rules
    from backend.shared.schema import findings, episodes as episodes_tbl, fraud_scores
    
    db_gen = get_db()
    conn = next(db_gen)
    
    try:
        with conn.begin():
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
                for f in all_findings:
                    findings_data.append({
                        "id": str(uuid.uuid4()),
                        "case_id": case_id,
                        "rule_id": f.rule_id,
                        "severity": f.severity,
                        "weight": f.weight,
                        "confidence": f.confidence,
                        "explanation": f.explanation,
                        "entity_ids": f.entity_ids,
                        "event_ids": f.event_ids,
                        "source_file_ids": f.source_file_ids,
                        "source_rows": f.source_rows
                    })
                conn.execute(findings.insert(), findings_data)
                
            # 5. Write fraud score to DB
            # Upsert or insert depending on DB. We'll delete and insert.
            conn.execute(fraud_scores.delete().where(fraud_scores.c.case_id == case_id))
            conn.execute(fraud_scores.insert().values(
                case_id=case_id,
                score=fs_result.score,
                risk_level=fs_result.risk_level,
                top_findings=[vars(f) for f in fs_result.top_findings],
                total_findings=fs_result.total_findings
            ))
            
    except Exception as e:
        print(f"Error in detection: {e}")
        raise
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

    return DetectionResult(
        case_id=case_id,
        findings=all_findings,
        episodes_created=len(eps),
        fraud_score=fs_result.score,
        risk_level=fs_result.risk_level
    )
