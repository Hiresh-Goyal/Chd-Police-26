"""FraudScore API."""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from backend.db.connection import get_connection
from backend.shared.schema import findings_table, fraud_scores_table

router = APIRouter(prefix="/cases", tags=["FraudScore"])


class TopFinding(BaseModel):
    id: str
    case_id: str
    rule_id: str
    severity: str
    fraud_weight: int
    weight: int
    confidence: float
    entity_ids: List[str]
    event_ids: List[str]
    source_file_ids: List[str]
    source_rows: List[int]
    explanation: str
    episode_id: Optional[str] = None
    created_at: Optional[str] = None


class FraudScoreResponse(BaseModel):
    score: int
    risk_level: str
    top_findings: List[TopFinding]
    total_findings: int
    findings_breakdown: Dict[str, int] = Field(default_factory=dict)
    computed_at: Optional[str] = None


def _json_list(value: Any) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _json_dict(value: Any) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _finding_view(row: Any) -> dict:
    return {
        "id": row.id,
        "case_id": row.case_id,
        "rule_id": row.rule_id,
        "severity": row.severity,
        "fraud_weight": int(row.fraud_weight),
        "weight": int(row.fraud_weight),
        "confidence": float(row.confidence),
        "entity_ids": _json_list(row.entity_ids),
        "event_ids": _json_list(row.event_ids),
        "source_file_ids": _json_list(row.source_file_ids),
        "source_rows": _json_list(row.source_rows),
        "explanation": row.explanation,
        "episode_id": row.episode_id,
        "created_at": row.created_at,
    }


@router.get("/{case_id}/fraudscore", response_model=FraudScoreResponse)
async def get_fraud_score(case_id: str):
    """Return aggregate score plus complete details for its top finding IDs.

    The database stores top_findings as IDs, preserving a normalized source of
    truth. The API expands those IDs into the same Finding shape used by the
    alerts endpoint, so consumers never have to guess what a top finding is.
    """
    with get_connection() as conn:
        score_row = conn.execute(
            select(fraud_scores_table)
            .where(fraud_scores_table.c.case_id == case_id)
            .order_by(fraud_scores_table.c.computed_at.desc())
        ).fetchone()

        if not score_row:
            return {
                "score": 0,
                "risk_level": "LOW",
                "top_findings": [],
                "total_findings": 0,
                "findings_breakdown": {},
                "computed_at": None,
            }

        finding_ids = [str(v) for v in _json_list(score_row.top_findings)]
        rows = []
        if finding_ids:
            rows = conn.execute(
                select(findings_table).where(
                    findings_table.c.case_id == case_id,
                    findings_table.c.id.in_(finding_ids),
                )
            ).fetchall()
        by_id = {row.id: row for row in rows}

        return {
            "score": int(score_row.score),
            "risk_level": score_row.risk_level,
            "top_findings": [_finding_view(by_id[fid]) for fid in finding_ids if fid in by_id],
            "total_findings": int(score_row.total_findings),
            "findings_breakdown": {str(k): int(v) for k, v in _json_dict(score_row.findings_breakdown).items()},
            "computed_at": score_row.computed_at,
        }
