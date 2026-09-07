import json
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter

from backend.db.connection import get_connection
from backend.shared.schema import (
    AuditLog,
    SentinelItem,
    SystemUser,
    audit_logs_table,
    sentinel_items_table,
    system_users_table,
)

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/users", response_model=List[SystemUser])
async def get_users():
    try:
        with get_connection() as conn:
            rows = conn.execute(system_users_table.select()).fetchall()
            return [
                SystemUser(
                    id=row.id,
                    name=row.name,
                    role=row.role,
                    station=row.station,
                    badge_number=row.badge_number,
                    status=row.status,
                    created_at=row.created_at,
                )
                for row in rows
            ]
    except Exception as e:
        print(f"Error fetching users: {e}")
        return []


@router.get("/audit", response_model=List[AuditLog])
async def get_audit_logs():
    try:
        with get_connection() as conn:
            # Order by timestamp desc
            rows = conn.execute(
                audit_logs_table.select().order_by(audit_logs_table.c.timestamp.desc())
            ).fetchall()
            return [
                AuditLog(
                    id=row.id,
                    timestamp=row.timestamp,
                    officer_name=row.officer_name,
                    officer_id=row.officer_id,
                    officer_role=row.officer_role,
                    officer_station=row.officer_station,
                    action=row.action,
                    target_entity=row.target_entity,
                    domain=row.domain,
                    ip_address=row.ip_address,
                    device_id=row.device_id,
                    status=row.status,
                    raw_metadata=json.loads(row.raw_metadata),
                )
                for row in rows
            ]
    except Exception as e:
        print(f"Error fetching audit logs: {e}")
        return []


@router.get("/sentinel", response_model=List[SentinelItem])
async def get_sentinel_items():
    try:
        with get_connection() as conn:
            rows = conn.execute(sentinel_items_table.select()).fetchall()
            return [
                SentinelItem(
                    id=row.id,
                    target_id=row.target_id,
                    type=row.type,
                    domain=row.domain,
                    status=row.status,
                    severity=row.severity,
                    last_active=row.last_active,
                    hit_count=row.hit_count,
                    notes=row.notes,
                    created_at=row.created_at,
                )
                for row in rows
            ]
    except Exception as e:
        print(f"Error fetching sentinel items: {e}")
        return []
