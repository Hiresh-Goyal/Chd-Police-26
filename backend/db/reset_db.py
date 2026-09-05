import sys
import os

# Add parent directory to path so we can import shared
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.schema import metadata
from db.connection import engine

def reset_db():
    print("Dropping all database tables...")
    metadata.drop_all(bind=engine)
    print("Tables dropped successfully.")
    
    print("Recreating database tables...")
    metadata.create_all(bind=engine)
    print("Tables recreated successfully.")

if __name__ == "__main__":
    reset_db()
