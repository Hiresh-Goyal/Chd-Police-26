"""
admin.py — Admin API routes for Users, Audit Logs, and Watchlist.
Registered as /api/admin/* in main.py.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db
from auth.dependencies import get_current_user, get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Audit log helper (call from other routers too) ─────────────────────────────

def log_audit(db: Session, user_id: str, action: str, entity_type: str = None,
               entity_id: str = None, details: dict = None):
    """Insert one audit log row. Silently ignores errors so it never breaks callers."""
    try:
        db.execute(text("""
            INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
            VALUES (:id, :user_id, :action, :entity_type, :entity_id, :details::jsonb, :ts)
        """), {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": __import__("json").dumps(details or {}),
            "ts": datetime.utcnow(),
        })
        db.commit()
    except Exception:
        db.rollback()


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    rows = db.execute(text(
        "SELECT id, username, role, is_active, created_at FROM users ORDER BY created_at DESC"
    )).fetchall()
    return [dict(r._mapping) for r in rows]


class RoleUpdate(BaseModel):
    role: str


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: uuid.UUID,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    if body.role not in ("admin", "investigator", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")
    db.execute(text("UPDATE users SET role = :role WHERE id = :id"),
               {"role": body.role, "id": user_id})
    db.commit()
    log_audit(db, str(current_user["id"]), "UPDATE_USER_ROLE",
              "USER", str(user_id), {"new_role": body.role})
    return {"status": "ok"}


@router.post("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    db.execute(text("UPDATE users SET is_active = false WHERE id = :id"),
               {"id": user_id})
    db.commit()
    log_audit(db, str(current_user["id"]), "DEACTIVATE_USER",
              "USER", str(user_id))
    return {"status": "ok"}


# ── Audit Logs ─────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    where = "WHERE 1=1"
    params: dict = {"limit": limit}
    if action:
        where += " AND action = :action"
        params["action"] = action

    rows = db.execute(text(f"""
        SELECT al.id, al.user_id, u.username, al.action,
               al.entity_type, al.entity_id, al.details, al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id::uuid
        {where}
        ORDER BY al.created_at DESC
        LIMIT :limit
    """), params).fetchall()

    return [dict(r._mapping) for r in rows]


# ── Watchlist ──────────────────────────────────────────────────────────────────

@router.get("/watchlist")
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    rows = db.execute(text(
        "SELECT * FROM watchlist ORDER BY created_at DESC"
    )).fetchall()
    return [dict(r._mapping) for r in rows]


class WatchlistEntry(BaseModel):
    entity_value: str
    entity_type: str
    reason: str


@router.post("/watchlist")
def add_watchlist(
    entry: WatchlistEntry,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    wid = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO watchlist (id, entity_value, entity_type, reason, is_active, created_by, created_at)
        VALUES (:id, :entity_value, :entity_type, :reason, true, :created_by, :ts)
    """), {
        "id": wid,
        "entity_value": entry.entity_value,
        "entity_type": entry.entity_type,
        "reason": entry.reason,
        "created_by": str(current_user["id"]),
        "ts": datetime.utcnow(),
    })
    db.commit()
    log_audit(db, str(current_user["id"]), "ADD_WATCHLIST",
              "WATCHLIST", wid, {"entity": entry.entity_value})
    return {"id": wid, "status": "created"}


@router.post("/watchlist/{watchlist_id}/toggle")
def toggle_watchlist(
    watchlist_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db.execute(text(
        "UPDATE watchlist SET is_active = NOT is_active WHERE id = :id"
    ), {"id": watchlist_id})
    db.commit()
    log_audit(db, str(current_user["id"]), "TOGGLE_WATCHLIST",
              "WATCHLIST", str(watchlist_id))
    return {"status": "toggled"}
