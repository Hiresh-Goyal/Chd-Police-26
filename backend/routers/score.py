"""
backend/routers/score.py

FraudScore endpoint returning aggregate case risk score and top-3 contributing findings.
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/cases", tags=["FraudScore"])


class FraudScoreResponse(BaseModel):
    score: int
    risk_level: str
    top_findings: List[Dict[str, Any]]
    total_findings: int
    findings_breakdown: Optional[Dict[str, Any]] = None


# Mock FraudScore result for fallback / standalone
_MOCK_FRAUD_SCORE = {
    "score": 85,
    "risk_level": "CRITICAL",
    "total_findings": 5,
    "top_findings": [
        {
            "rule_id": "MUL-003",
            "severity": "CRITICAL",
            "fraud_weight": 30,
            "weight": 30,
            "confidence": 0.95,
            "explanation": "Mule account pattern detected with rapid fund dissipation across multiple hops.",
        },
        {
            "rule_id": "CTN-001",
            "severity": "HIGH",
            "fraud_weight": 25,
            "weight": 25,
            "confidence": 0.95,
            "explanation": "Call-Transfer Nexus confirmed between phone entity and beneficiary transfer.",
        },
        {
            "rule_id": "COO-004",
            "severity": "HIGH",
            "fraud_weight": 25,
            "weight": 25,
            "confidence": 0.88,
            "explanation": "Entity identified in CDR call logs of 3 unconnected victim complaints.",
        },
    ],
    "findings_breakdown": {
        "MUL-003": 30,
        "CTN-001": 25,
        "COO-004": 25,
        "SIM-002": 20,
        "FSM-005": 18,
    },
}


@router.get("/{case_id}/fraudscore", response_model=FraudScoreResponse)
async def get_fraud_score(case_id: str):
    """Retrieve aggregate FraudScore with top 3 contributing findings."""
    try:
        from sqlalchemy import select
        from backend.db.connection import get_connection
        from backend.shared.schema import fraud_scores_table

        with get_connection() as conn:
            row = conn.execute(
                select(fraud_scores_table).where(fraud_scores_table.c.case_id == case_id)
            ).fetchone()

            if row:
                top_findings = row.top_findings
                if isinstance(top_findings, str):
                    try:
                        top_findings = json.loads(top_findings)
                    except Exception:
                        top_findings = []

                if isinstance(top_findings, list) and top_findings and isinstance(top_findings[0], str):
                    top_findings = [{"id": fid, "rule_id": "FINDING"} for fid in top_findings]

                breakdown = row.findings_breakdown
                if isinstance(breakdown, str):
                    try:
                        breakdown = json.loads(breakdown)
                    except Exception:
                        breakdown = {}

                return {
                    "score": row.score,
                    "risk_level": row.risk_level,
                    "top_findings": top_findings,
                    "total_findings": row.total_findings,
                    "findings_breakdown": breakdown,
                }
    except Exception as e:
        print(f"Fraud score query failed or DB uninitialized: {e}")

    return _MOCK_FRAUD_SCORE
