"""Create the current schema and bootstrap application metadata."""

from backend.db.connection import get_engine
from backend.db.seed import seed_users
from backend.shared.schema import metadata


def init_db():
    engine = get_engine()
    metadata.create_all(engine)
    with engine.begin() as conn:
        seed_users(conn)
    print("[OK] All tables created and application metadata initialized.")


if __name__ == "__main__":
    init_db()
