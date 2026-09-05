import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Default to the given Postgres connection from the instructions
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/digitalsentinel")

# Synchronous engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Session local factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for FastAPI endpoints to get a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
