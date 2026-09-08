import uuid
import bcrypt
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update, delete

from backend.auth.jwt import get_current_user
from backend.db.connection import get_connection
from backend.shared.schema import users_table

router = APIRouter(prefix="/users", tags=["Users"])

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    rank: Optional[str] = None
    unit: Optional[str] = None
    station: Optional[str] = None
    email: Optional[str] = None
    role: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    rank: Optional[str] = None
    unit: Optional[str] = None
    station: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    badge_id: Optional[str] = None
    rank: Optional[str] = None
    unit: Optional[str] = None
    station: Optional[str] = None
    email: Optional[str] = None
    role: str
    status: str
    mfa_enabled: str
    created_at: str
    updated_at: str

@router.get("", response_model=List[UserResponse])
def get_users(current_user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        stmt = select(users_table)
        rows = conn.execute(stmt).fetchall()
        
    return [dict(r._mapping) for r in rows]

@router.post("", response_model=UserResponse)
def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    hashed = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode()
    
    with get_connection() as conn:
        # Check if username exists
        existing = conn.execute(select(users_table).where(users_table.c.username == user.username)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
            
        values = {
            "id": new_id,
            "username": user.username,
            "password_hash": hashed,
            "full_name": user.full_name,
            "rank": user.rank,
            "unit": user.unit,
            "station": user.station,
            "email": user.email,
            "role": user.role,
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
        }
        conn.execute(users_table.insert().values(**values))
        conn.commit()
        
        created = conn.execute(select(users_table).where(users_table.c.id == new_id)).fetchone()
        
    return dict(created._mapping)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    update_data = payload.dict(exclude_unset=True)
    update_data["updated_at"] = now
    
    with get_connection() as conn:
        stmt = update(users_table).where(users_table.c.id == user_id).values(**update_data)
        res = conn.execute(stmt)
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
        conn.commit()
        
        updated = conn.execute(select(users_table).where(users_table.c.id == user_id)).fetchone()
    return dict(updated._mapping)

@router.delete("/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        stmt = delete(users_table).where(users_table.c.id == user_id)
        conn.execute(stmt)
        conn.commit()
    return {"status": "ok"}
