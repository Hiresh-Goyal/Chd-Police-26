import json
from datetime import datetime, timezone
from uuid import uuid4
from backend.shared.schema import audit_logs
from backend.db.connection import get_connection


def log_action(
    user: str,
    action: str,
    case_id: str = None,
    target: str = None,
    detail: dict = None,
    ip_address: str = None,
):
    """
    Write one row to audit_logs.
    Call this from every sensitive router endpoint.
    Never raises — audit failure must not block the main request.
    """
    try:
        with get_connection() as conn:
            conn.execute(
                audit_logs.insert().values(
                    id=str(uuid4()),
                    case_id=case_id,
                    user=user,
                    action=action,
                    target=target,
                    detail=json.dumps(detail) if detail else None,
                    ip_address=ip_address,
                    ts=datetime.now(timezone.utc).isoformat(),
                )
            )
            conn.commit()
    except Exception:
        pass  # audit must never crash the main request
