import sys
import os

# Add parent directory to path so we can import shared
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.schema import metadata
from db.connection import engine

def init_db():
    print("Creating database tables...")
    metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    init_db()
