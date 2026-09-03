"""
backend/db/connection.py

Database connection factory using SQLAlchemy Core.
Reads DATABASE_URL from backend/.env via python-dotenv.
"""

import os
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load .env from backend/ directory
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/digital_sentinel",
)

_engine = None


def get_engine():
    """Return a singleton SQLAlchemy engine."""
    global _engine
    if _engine is None:
        _engine = create_engine(_DATABASE_URL, echo=False, pool_pre_ping=True)
    return _engine


@contextmanager
def get_connection():
    """Yield a transactional database connection (auto-commits on success)."""
    engine = get_engine()
    with engine.connect() as conn:
        with conn.begin():
            yield conn
