"""
backend/db/init_db.py

Creates all 8 tables from shared/schema.py on the target PostgreSQL database.

Usage:
    python -m backend.db.init_db
"""

from backend.db.connection import get_engine
from backend.shared.schema import metadata


def init_db():
    """Create all tables defined in schema.py (idempotent — skips existing)."""
    engine = get_engine()
    metadata.create_all(engine)
    print("✓ All tables created successfully.")


if __name__ == "__main__":
    init_db()
