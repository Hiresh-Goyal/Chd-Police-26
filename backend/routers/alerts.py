"""
backend/routers/alerts.py

Alerts and Finding detail endpoints providing evidence drill-down from finding to raw events.
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from backend.auth.audit import log_action
from backend.auth.jwt import get_current_user

router = APIRouter(prefix="/cases", tags=["Alerts"])


class FindingSummary(BaseModel):
    id: str
    case_id: Optional[str] = None
    rule_id: str
    severity: str
    fraud_weight: int
    weight: Optional[int] = None
    confidence: float
    entity_ids: List[str]
    event_ids: List[str]
    source_file_ids: List[str]
    source_rows: List[int]
    explanation: str
    episode_id: Optional[str] = None
    episode_summary: Optional[str] = None
    created_at: Optional[str] = None


class FindingDetail(FindingSummary):
    events: List[Dict[str, Any]] = Field(default_factory=list)






def _event_confidence_tier(conn, case_id: str, entity_id: str | None) -> str:
    if not entity_id:
        return "CANDIDATE"
    from sqlalchemy import select
    from backend.shared.schema import entity_links_table
    rows = conn.execute(
        select(entity_links_table.c.confidence_tier).where(
            entity_links_table.c.case_id == case_id,
            (entity_links_table.c.entity_a == entity_id) | (entity_links_table.c.entity_b == entity_id),
        )
    ).fetchall()
    order = {"CANDIDATE": 0, "PROBABLE": 1, "CONFIRMED": 2}
    return min((str(r.confidence_tier) for r in rows), key=lambda x: order.get(x, 0), default="CONFIRMED")


def _parse_json_field(val: Any) -> list:
    """Safely parse a JSON string or list."""
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return []


@router.get("/{case_id}/alerts", response_model=List[FindingSummary])
async def get_alerts(
    case_id: str,
    request: Request = None,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Retrieve alerts/findings list sorted by (fraud_weight * confidence) descending."""
    user_name = current_user.get("username", "admin") if isinstance(current_user, dict) else str(current_user or "admin")
    log_action(
        user=user_name,
        action="VIEW_ALERTS",
        case_id=case_id,
        ip_address=request.client.host if request and request.client else None,
    )

    from sqlalchemy import select
    from backend.db.connection import get_connection
    from backend.shared.schema import findings_table, cases_table

    with get_connection() as conn:
        if conn.execute(select(cases_table.c.id).where(cases_table.c.id == case_id)).fetchone() is None:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        rows = conn.execute(
            select(findings_table).where(findings_table.c.case_id == case_id)
        ).fetchall()

        if rows:
            from backend.shared.schema import episodes_table
            episode_ids = [r.episode_id for r in rows if r.episode_id]
            episode_map = {}
            if episode_ids:
                ep_rows = conn.execute(
                    select(episodes_table).where(episodes_table.c.id.in_(episode_ids))
                ).fetchall()
                episode_map = {ep.id: ep.summary for ep in ep_rows}
            results = []
            for r in rows:
                results.append({
                    "id": r.id,
                    "case_id": r.case_id,
                    "rule_id": r.rule_id,
                    "severity": r.severity,
                    "fraud_weight": r.fraud_weight,
                    "weight": r.fraud_weight,
                    "confidence": r.confidence,
                    "entity_ids": _parse_json_field(r.entity_ids),
                    "event_ids": _parse_json_field(r.event_ids),
                    "source_file_ids": _parse_json_field(r.source_file_ids),
                    "source_rows": _parse_json_field(r.source_rows),
                    "explanation": r.explanation,
                    "episode_id": r.episode_id,
                    "episode_summary": episode_map.get(r.episode_id),
                    "created_at": r.created_at,
                })

            # Sort by weight * confidence descending
            results.sort(
                key=lambda x: (x.get("fraud_weight", 0) or 0) * (x.get("confidence", 0.0) or 0.0),
                reverse=True,
            )
            return results
        return []


@router.get("/{case_id}/alerts/{finding_id}", response_model=FindingDetail)
async def get_alert_detail(case_id: str, finding_id: str):
    """Retrieve full finding detail including linked canonical event objects and episode narrative."""
    from sqlalchemy import select
    from backend.db.connection import get_connection
    from backend.shared.schema import (
        canonical_events_table,
        episodes_table,
        findings_table,
    )

    with get_connection() as conn:
        f_row = conn.execute(
            select(findings_table).where(
                findings_table.c.id == finding_id,
                findings_table.c.case_id == case_id,
            )
        ).fetchone()

        if f_row:
            event_ids = _parse_json_field(f_row.event_ids)
            events = []
            if event_ids:
                ev_rows = conn.execute(
                    select(canonical_events_table).where(
                        canonical_events_table.c.id.in_(event_ids)
                    )
                ).fetchall()
                for ev in ev_rows:
                    events.append({
                        "id": ev.id,
                        "event_type": str(ev.event_type),
                        "ts_start": ev.ts_start,
                        "ts_end": ev.ts_end,
                        "actor_entity_id": ev.actor_entity_id or "",
                        "actor_raw": ev.actor_raw,
                        "actor_confidence_tier": _event_confidence_tier(conn, case_id, ev.actor_entity_id),
                        "peer_raw": ev.peer_raw,
                        "amount": ev.amount,
                        "location_raw": ev.location_raw,
                        "source_file_id": ev.source_file_id,
                        "source_row": ev.source_row,
                    })

            ep_summary = None
            if f_row.episode_id:
                ep_row = conn.execute(
                    select(episodes_table).where(episodes_table.c.id == f_row.episode_id)
                ).fetchone()
                if ep_row:
                    ep_summary = ep_row.summary

            return {
                "id": f_row.id,
                "case_id": f_row.case_id,
                "rule_id": f_row.rule_id,
                "severity": f_row.severity,
                "fraud_weight": f_row.fraud_weight,
                "weight": f_row.fraud_weight,
                "confidence": f_row.confidence,
                "entity_ids": _parse_json_field(f_row.entity_ids),
                "event_ids": event_ids,
                "source_file_ids": _parse_json_field(f_row.source_file_ids),
                "source_rows": _parse_json_field(f_row.source_rows),
                "explanation": f_row.explanation,
                "episode_id": f_row.episode_id,
                "episode_summary": ep_summary,
                "created_at": f_row.created_at,
                "events": events,
            }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Finding {finding_id} not found in case {case_id}",
    )
