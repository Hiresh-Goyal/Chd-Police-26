"""
backend/db/reset_db.py

Drops ALL tables then recreates them from schema.py.
DEV ONLY — destroys all data.

Usage:
    python -m backend.db.reset_db
"""

from backend.db.connection import get_engine
from backend.shared.schema import metadata


def reset_db():
    """Drop all tables and recreate from scratch. DEV ONLY."""
    engine = get_engine()
    metadata.drop_all(engine)
    print("✗ All tables dropped.")
    metadata.create_all(engine)
    print("✓ All tables recreated.")


if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA. Type 'yes' to continue: ")
    if confirm.strip().lower() == "yes":
        reset_db()
    else:
        print("Aborted.")
