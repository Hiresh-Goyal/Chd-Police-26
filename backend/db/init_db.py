"""
backend/db/init_db.py

Creates all 8 tables from shared/schema.py on the target PostgreSQL database.

Usage:
    python -m backend.db.init_db
"""

from backend.db.connection import get_engine, get_connection
from backend.shared.schema import metadata, users_table
import bcrypt
import uuid
from datetime import datetime, timezone


def init_db():
    """Create all tables defined in schema.py (idempotent — skips existing)."""
    engine = get_engine()
    metadata.create_all(engine)
    print("[OK] All tables created successfully.")
    
    # Seed default users
    try:
        seed_users()
        print("[OK] Default users seeded successfully.")
    except Exception as e:
        print(f"[WARN] User seeding failed or already exists: {e}")

def seed_users():
    now = datetime.now(timezone.utc).isoformat()
    default_users = [
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": bcrypt.hashpw(b"sentinel_admin", bcrypt.gensalt()).decode(),
            "full_name": "System Administrator",
            "role": "admin",
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "username": "investigator",
            "password_hash": bcrypt.hashpw(b"sentinel_inv", bcrypt.gensalt()).decode(),
            "full_name": "Lead Investigator",
            "role": "investigator",
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
        },
    ]
    with get_connection() as conn:
        for u in default_users:
            conn.execute(users_table.insert().values(**u))
        conn.commit()


if __name__ == "__main__":
    init_db()
