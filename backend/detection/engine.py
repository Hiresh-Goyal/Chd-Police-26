from dataclasses import dataclass, field
from typing import List
from contextlib import nullcontext
import json
import uuid


@dataclass
class FindingResult:
    rule_id: str
    severity: str  # CRITICAL | HIGH | MEDIUM | LOW
    weight: int
    confidence: float
    entity_ids: List[str]
    event_ids: List[str]
    source_file_ids: List[str]
    source_rows: List[int]
    explanation: str  # human-readable, template-generated
    id: str | None = None
    episode_id: str | None = None


@dataclass
class DetectionResult:
    case_id: str
    findings: List[FindingResult] = field(default_factory=list)
    episodes_created: int = 0
    fraud_score: int = 0
    risk_level: str = "LOW"


def run_detection(case_id: str, connection=None) -> DetectionResult:
    """
    Run the complete detection pipeline for a case.

    Pipeline:
        1. Build episodes
        2. Run all detection rules
        3. Compute fraud score
        4. Persist findings
        5. Persist fraud score

    Returns:
        DetectionResult containing findings, episode count,
        fraud score, and risk level.
    """

    from backend.db.connection import get_connection
    from backend.detection.episodes import build_episodes
    from backend.detection.score import compute_fraud_score
    from backend.detection.rules import run_all_rules
    from backend.shared.schema import (
        findings_table,
        episodes_table,
        fraud_scores_table,
    )

    all_findings = []
    eps = []
    fs_result = None

    try:
        with (nullcontext(connection) if connection is not None else get_connection()) as conn:

            # Detection output is derived. Remove a prior run in FK-safe order
            # before creating the replacement result set.
            conn.execute(findings_table.delete().where(findings_table.c.case_id == case_id))
            conn.execute(episodes_table.delete().where(episodes_table.c.case_id == case_id))
            conn.execute(fraud_scores_table.delete().where(fraud_scores_table.c.case_id == case_id))

            # ---------------------------------------------------------
            # 1. Build Episodes
            # ---------------------------------------------------------

            eps = build_episodes(conn, case_id)

            if eps:
                conn.execute(
                    episodes_table.insert(),
                    eps,
                )

            # ---------------------------------------------------------
            # 2. Run all detection rules
            # ---------------------------------------------------------

            all_findings = run_all_rules(conn, case_id)

            # ---------------------------------------------------------
            # 3. Compute Fraud Score
            # ---------------------------------------------------------

            fs_result = compute_fraud_score(
                case_id,
                all_findings,
            )

            # ---------------------------------------------------------
            # 4. Persist Findings
            # ---------------------------------------------------------

            if all_findings:
                findings_data = []

                for finding in all_findings:
                    finding.id = str(uuid.uuid4())
                    for episode in eps:
                        if set(finding.event_ids) & set(json.loads(episode["event_ids"])):
                            finding.episode_id = episode["id"]
                            break
                    findings_data.append(
                        {
                            "id": finding.id,
                            "case_id": case_id,
                            "episode_id": finding.episode_id,
                            "rule_id": finding.rule_id,
                            "severity": finding.severity,
                            "fraud_weight": finding.weight,
                            "confidence": finding.confidence,
                            "entity_ids": json.dumps(
                                finding.entity_ids
                            ),
                            "event_ids": json.dumps(
                                finding.event_ids
                            ),
                            "source_file_ids": json.dumps(
                                finding.source_file_ids
                            ),
                            "source_rows": json.dumps(
                                finding.source_rows
                            ),
                            "explanation": finding.explanation,
                            "rule_version": "1.0",
                            "created_at": _now_iso(),
                        }
                    )

                conn.execute(
                    findings_table.insert(),
                    findings_data,
                )

            # ---------------------------------------------------------
            # 5. Persist Fraud Score
            # ---------------------------------------------------------

            top_findings = [
                finding.id
                for finding in fs_result.top_findings
            ]

            conn.execute(
                fraud_scores_table.insert().values(
                    id=str(uuid.uuid4()),
                    case_id=case_id,
                    score=fs_result.score,
                    risk_level=fs_result.risk_level,
                    findings_breakdown=json.dumps(fs_result.findings_breakdown),
                    top_findings=json.dumps(top_findings),
                    total_findings=fs_result.total_findings,
                    computed_at=_now_iso(),
                )
            )

    except Exception as e:
        print(f"Error in detection: {e}")
        raise

    return DetectionResult(
        case_id=case_id,
        findings=all_findings,
        episodes_created=len(eps),
        fraud_score=fs_result.score,
        risk_level=fs_result.risk_level,
    )


def _now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
