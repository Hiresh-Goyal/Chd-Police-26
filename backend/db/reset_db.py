"""Development-only destructive database reset."""

from backend.db.connection import get_engine
from backend.db.seed import seed_users
from backend.shared.schema import metadata


def reset_db():
    engine = get_engine()
    print("[INFO] Dropping all tables...")
    metadata.drop_all(engine)
    print("[OK] All tables dropped.")
    print("[INFO] Recreating all tables...")
    metadata.create_all(engine)
    with engine.begin() as conn:
        seed_users(conn)
    print("[OK] All tables recreated and application metadata initialized.")


if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA from the database. Type 'yes' to continue: ")
    if confirm.strip().lower() == "yes":
        reset_db()
    else:
        print("[ABORTED] Database reset cancelled.")
