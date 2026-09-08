from typing import Any
from fastapi import APIRouter, Depends
from backend.db.connection import get_connection
from backend.shared.schema import audit_logs
from backend.auth.jwt import get_current_user
from sqlalchemy import select, desc

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
def get_audit_logs(
    case_id: str = None,
    from_date: str = None,
    to_date: str = None,
    limit: int = 100,
    current_user: Any = Depends(get_current_user),
):
    with get_connection() as conn:
        q = select(audit_logs).order_by(desc(audit_logs.c.ts)).limit(limit)
        if case_id:
            q = q.where((audit_logs.c.case_id == case_id) | (audit_logs.c.case_id.is_(None)))
        if from_date:
            q = q.where(audit_logs.c.ts >= from_date)
        if to_date:
            q = q.where(audit_logs.c.ts <= to_date + "T23:59:59Z")
        rows = conn.execute(q).fetchall()
        return [dict(row._mapping) for row in rows]
