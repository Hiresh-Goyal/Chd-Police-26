"""
backend/routers/auth.py

Authentication endpoints for DigitalSentinel.
Handles login and user status retrieval.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from backend.auth.audit import log_action
from backend.auth.jwt import (
    authenticate_user,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class UserResponse(BaseModel):
    username: str
    role: str


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, request: Request):
    """Authenticate user with username and password.

    Hardcoded accounts:
    - admin / sentinel_admin (role: admin)
    - investigator / sentinel_inv (role: investigator)
    """
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )

    log_action(
        user=credentials.username,
        action="LOGIN",
        ip_address=request.client.host if request.client else None,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve currently authenticated user profile."""
    return {
        "username": current_user["username"],
        "role": current_user["role"],
    }
