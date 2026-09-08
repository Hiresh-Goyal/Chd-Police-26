"""
backend/db/reset_db.py

Drops ALL tables and recreates them from shared/schema.py.
DEV ONLY — destroys all data.

Usage:
    python -m backend.db.reset_db
"""

from backend.db.connection import get_engine
from backend.shared.schema import metadata


def reset_db():
    """Drop all tables and recreate them from the current schema. DEV ONLY."""
    engine = get_engine()

    print("[INFO] Dropping all tables...")
    metadata.drop_all(engine)
    print("[OK] All tables dropped.")

    print("[INFO] Recreating all tables...")
    metadata.create_all(engine)
    print("[OK] All tables recreated successfully.")


if __name__ == "__main__":
    confirm = input(
        "This will DELETE ALL DATA from the database. "
        "Type 'yes' to continue: "
    )

    if confirm.strip().lower() == "yes":
        reset_db()
    else:
        print("[ABORTED] Database reset cancelled.")