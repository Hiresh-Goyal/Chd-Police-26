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
    user_role: str = None,
    domain: str = "SYS",
    status: str = "SUCCESS",
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
                    ts=datetime.now(timezone.utc).isoformat(),
                    user=user,
                    user_role=user_role,
                    action=action,
                    case_id=case_id,
                    target_entity=target,
                    domain=domain,
                    ip_address=ip_address,
                    device_id=None,
                    status=status,
                    metadata=json.dumps(detail) if detail else None,
                )
            )
            conn.commit()
    except Exception as e:
        print(f"Audit Error: {e}")
        pass  # audit must never crash the main request
