"""Administrative directory endpoints used by the investigator UI."""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select

from backend.auth.audit import log_action
from backend.auth.jwt import get_current_user
from backend.db.connection import get_connection
from backend.shared.schema import users_table

router = APIRouter(prefix="/admin", tags=["Administration"])


class UserResponse(BaseModel):
    id: str
    username: str
    badge_id: Optional[str] = None
    name: str
    rank: Optional[str] = None
    unit: Optional[str] = None
    station: Optional[str] = None
    email: Optional[str] = None
    role: str
    status: str
    mfa_enabled: bool
    active_sessions: int = 0
    audit_count_24h: int = 0


class CreateUserRequest(BaseModel):
    username: str
    name: str
    rank: Optional[str] = None
    unit: Optional[str] = None
    station: Optional[str] = None
    email: Optional[str] = None
    role: str = "investigator"
    badge_id: Optional[str] = None
    mfa_enabled: bool = True


def _row_view(conn, row) -> dict:
    from backend.shared.schema import audit_logs
    # Audit count is computed from persisted audit activity, not maintained as
    # a fake counter in the UI.
    since = (datetime.now(timezone.utc).timestamp() - 24 * 3600)
    # Stored audit timestamps are ISO strings; a direct SQL string comparison
    # works for the normalized UTC representation.
    cutoff = datetime.fromtimestamp(since, timezone.utc).isoformat()
    count = conn.execute(
        select(audit_logs.c.id).where(
            audit_logs.c.user == row.username,
            audit_logs.c.ts >= cutoff,
        )
    ).fetchall()
    return {
        "id": row.id,
        "username": row.username,
        "badge_id": row.badge_id,
        "name": row.name,
        "rank": row.rank,
        "unit": row.unit,
        "station": row.station,
        "email": row.email,
        "role": row.role,
        "status": row.status,
        "mfa_enabled": bool(row.mfa_enabled),
        "active_sessions": 0,
        "audit_count_24h": len(count),
    }


@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        rows = conn.execute(select(users_table).order_by(users_table.c.name.asc())).fetchall()
        return [_row_view(conn, row) for row in rows]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: CreateUserRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    username = data.username.strip()
    name = data.name.strip()
    if not username or not name:
        raise HTTPException(status_code=400, detail="username and name are required")
    with get_connection() as conn:
        if conn.execute(select(users_table.c.id).where(users_table.c.username == username)).fetchone():
            raise HTTPException(status_code=409, detail="Username already exists")
        row = {
            "id": str(uuid4()), "username": username, "badge_id": data.badge_id,
            "name": name, "rank": data.rank, "unit": data.unit, "station": data.station,
            "email": data.email, "role": data.role, "status": "ACTIVE",
            "mfa_enabled": 1 if data.mfa_enabled else 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        conn.execute(users_table.insert().values(**row))
        created = conn.execute(select(users_table).where(users_table.c.id == row["id"])).fetchone()
        result = _row_view(conn, created)
    log_action(
        user=current_user.get("username", "unknown"), action="CREATE_USER", target=username,
        detail={"role": data.role}, ip_address=request.client.host if request.client else None,
    )
    return result
