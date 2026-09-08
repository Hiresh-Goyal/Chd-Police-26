import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update, delete

from backend.auth.jwt import get_current_user
from backend.db.connection import get_connection
from backend.shared.schema import sentinel_watches_table

router = APIRouter(prefix="/sentinelwatch", tags=["SentinelWatch"])

class WatchCreate(BaseModel):
    identifier: str
    name: Optional[str] = None
    stream_type: str
    threshold: str
    case_ref: Optional[str] = None
    expiry_date: Optional[str] = None

class WatchUpdate(BaseModel):
    name: Optional[str] = None
    stream_type: Optional[str] = None
    threshold: Optional[str] = None
    status: Optional[str] = None
    case_ref: Optional[str] = None
    expiry_date: Optional[str] = None

class WatchResponse(BaseModel):
    id: str
    identifier: str
    name: Optional[str] = None
    stream_type: str
    threshold: str
    risk_score: int
    status: str
    last_activity: Optional[str] = None
    case_ref: Optional[str] = None
    expiry_date: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str
    updated_at: str

@router.get("", response_model=List[WatchResponse])
def get_watchlist(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        stmt = select(sentinel_watches_table)
        if status:
            stmt = stmt.where(sentinel_watches_table.c.status == status)
        rows = conn.execute(stmt).fetchall()
        
    return [dict(r._mapping) for r in rows]

@router.post("", response_model=WatchResponse)
def create_watch(watch: WatchCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    
    with get_connection() as conn:
        values = {
            "id": new_id,
            "identifier": watch.identifier,
            "name": watch.name,
            "stream_type": watch.stream_type,
            "threshold": watch.threshold,
            "risk_score": 0,
            "status": "ACTIVE",
            "case_ref": watch.case_ref,
            "expiry_date": watch.expiry_date,
            "created_by": current_user.get("username"),
            "created_at": now,
            "updated_at": now,
        }
        conn.execute(sentinel_watches_table.insert().values(**values))
        conn.commit()
        
        created = conn.execute(select(sentinel_watches_table).where(sentinel_watches_table.c.id == new_id)).fetchone()
        
    return dict(created._mapping)

@router.put("/{watch_id}", response_model=WatchResponse)
def update_watch(watch_id: str, payload: WatchUpdate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    update_data = payload.dict(exclude_unset=True)
    update_data["updated_at"] = now
    
    with get_connection() as conn:
        stmt = update(sentinel_watches_table).where(sentinel_watches_table.c.id == watch_id).values(**update_data)
        res = conn.execute(stmt)
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Watch item not found")
        conn.commit()
        
        updated = conn.execute(select(sentinel_watches_table).where(sentinel_watches_table.c.id == watch_id)).fetchone()
    return dict(updated._mapping)

@router.delete("/{watch_id}")
def delete_watch(watch_id: str, current_user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        stmt = delete(sentinel_watches_table).where(sentinel_watches_table.c.id == watch_id)
        conn.execute(stmt)
        conn.commit()
    return {"status": "ok"}
