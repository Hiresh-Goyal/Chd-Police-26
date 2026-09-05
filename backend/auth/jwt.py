import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import text
from db.connection import engine
from shared.schema import users

SECRET_KEY = os.getenv("JWT_SECRET", "change-this-to-a-secure-random-string-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def setup_users():
    """Seed initial users into the database if not present."""
    with engine.begin() as conn:
        res = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if res == 0:
            print("Seeding initial users...")
            conn.execute(
                users.insert(),
                [
                    {
                        "username": "admin",
                        "hashed_password": pwd_context.hash("sentinel_admin_2026"),
                        "role": "admin",
                        "is_active": True
                    },
                    {
                        "username": "investigator",
                        "hashed_password": pwd_context.hash("sentinel_inv_2026"),
                        "role": "investigator",
                        "is_active": True
                    }
                ]
            )

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
