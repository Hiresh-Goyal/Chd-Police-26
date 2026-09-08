"""Operational dashboard summary derived from current database state."""

from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select

from backend.auth.jwt import get_current_user
from backend.db.connection import get_connection
from backend.services.case_views import build_case_stats
from backend.shared.schema import cases_table, entities_table, findings_table, raw_files_table

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardOverview(BaseModel):
    agency_name: str
    current_time: str
    total_cases: int
    active_cases: int
    critical_alerts: int
    total_entities: int
    total_evidence: int
    evidence_by_domain: Dict[str, int]


@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(current_user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        cases = conn.execute(select(cases_table)).fetchall()
        entities = conn.execute(select(entities_table.c.id)).fetchall()
        findings = conn.execute(select(findings_table.c.severity)).fetchall()
        files = conn.execute(select(raw_files_table.c.file_type)).fetchall()
        evidence_by_domain: Dict[str, int] = {"CDR": 0, "BANK": 0, "IPDR": 0, "SOCIAL": 0}
        for row in files:
            evidence_by_domain[str(row.file_type)] = evidence_by_domain.get(str(row.file_type), 0) + 1
        return {
            "agency_name": "Chandigarh Police UT",
            "current_time": datetime.now(timezone.utc).isoformat(),
            "total_cases": len(cases),
            "active_cases": sum(1 for row in cases if row.status in {"OPEN", "IN_PROGRESS"}),
            "critical_alerts": sum(1 for row in findings if row.severity == "CRITICAL"),
            "total_entities": len(entities),
            "total_evidence": len(files),
            "evidence_by_domain": evidence_by_domain,
        }
