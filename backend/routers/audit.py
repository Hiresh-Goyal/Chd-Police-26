"""Audit log API with a stable frontend-facing forensic view."""

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select

from backend.auth.jwt import get_current_user
from backend.db.connection import get_connection
from backend.shared.schema import audit_logs, users_table

router = APIRouter(prefix="/audit", tags=["Audit"])


def _detail(value: Any) -> dict:
    if isinstance(value, dict): return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}



_ACTION_LABELS = {
    "LOGIN": "User Login",
    "LOGIN_FAILED": "Failed Authentication",
    "CREATE_CASE": "Created Case",
    "UPDATE_CASE": "Modified Case Details",
    "UPLOAD": "Uploaded Evidence",
    "ANALYZE": "Analyzed Case",
    "VIEW_ALERTS": "Viewed Alerts",
    "VIEW_REPORT": "Viewed Evidence Report",
    "CREATE_CASE_NOTE": "Added Case Note",
    "CREATE_USER": "Provisioned User",
}

def _domain(action: str, detail: dict) -> str:
    ft = str(detail.get("file_type", "")).upper()
    if ft in {"CDR", "BANK", "IPDR", "SOCIAL"}:
        return ft
    a = action.upper()
    for key in ("CDR", "BANK", "IPDR", "SOCIAL"):
        if key in a:
            return key
    return "SYS"


def _user_profile(conn, username: str):
    return conn.execute(select(users_table).where(users_table.c.username == username)).fetchone()


def _view(conn, row) -> dict:
    detail = _detail(row.detail)
    profile = _user_profile(conn, row.user)
    badge = profile.badge_id if profile else None
    officer_id = badge or row.user
    officer_name = profile.name if profile else row.user
    officer_role = profile.role if profile else "investigator"
    officer_station = profile.station if profile else "—"
    return {
        "id": row.id,
        "timestamp": row.ts,
        "created_at": row.ts,
        "officer_name": officer_name,
        "officer_id": officer_id,
        "officer_role": officer_role,
        "officer_station": officer_station,
        "action": _ACTION_LABELS.get(row.action, row.action),
        "raw_action": row.action,
        "target_entity": row.target or "—",
        "domain": _domain(row.action, detail),
        "ip_address": row.ip_address or "—",
        "device_id": detail.get("device_id", "—"),
        "status": detail.get("status", "SUCCESS"),
        "case_id": row.case_id,
        "raw_metadata": {
            "event_id": row.id,
            "timestamp": row.ts,
            "action": _ACTION_LABELS.get(row.action, row.action),
        "raw_action": row.action,
            "resource": {
                "type": detail.get("resource_type", "case" if row.case_id else "system"),
                "id": row.target,
                "case_id": row.case_id,
            },
            "actor": {
                "user_id": officer_id,
                "auth_method": detail.get("auth_method", "jwt"),
            },
            "audit_context": {
                "justification_provided": bool(detail.get("justification_provided", False)),
                "justification_code": detail.get("justification_code", "") ,
            },
            **detail,
        },
    }


@router.get("/logs")
def get_audit_logs(
    case_id: Optional[str] = None,
    limit: int = 100,
    current_user: Any = Depends(get_current_user),
):
    limit = max(1, min(limit, 500))
    with get_connection() as conn:
        q = select(audit_logs).order_by(desc(audit_logs.c.ts)).limit(limit)
        if case_id:
            q = q.where((audit_logs.c.case_id == case_id) | (audit_logs.c.case_id.is_(None)))
        rows = conn.execute(q).fetchall()
        return [_view(conn, row) for row in rows]
