"""Idempotent development/bootstrap data for application metadata only.

This does not seed investigation evidence, cases, findings, or demo results.
"""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select

from backend.shared.schema import users_table


USERS = [
    {
        "username": "admin", "badge_id": "ADMIN", "name": "System Administrator",
        "rank": "Administrator", "unit": "Headquarters", "station": "UT Police HQ",
        "email": "admin@chdpolice.gov.in", "role": "admin",
    },
    {
        "username": "investigator", "badge_id": "INV-001", "name": "Investigator",
        "rank": "Investigator", "unit": "Cyber Crime Investigation Unit", "station": "Cyber Cell HQ",
        "email": "investigator@chdpolice.gov.in", "role": "investigator",
    },
]


def seed_users(conn) -> None:
    existing = {row.username for row in conn.execute(select(users_table.c.username)).fetchall()}
    now = datetime.now(timezone.utc).isoformat()
    for item in USERS:
        if item["username"] in existing:
            continue
        conn.execute(users_table.insert().values(
            id=str(uuid4()), **item, status="ACTIVE", mfa_enabled=1, created_at=now
        ))
