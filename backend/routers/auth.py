from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.connection import get_db
from auth.jwt import verify_password, create_access_token
from auth.dependencies import get_current_user

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT * FROM users WHERE username = :username"),
        {"username": req.username}
    ).fetchone()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.get("/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["id"]),
        "username": current_user["username"],
        "role": current_user["role"],
    }
