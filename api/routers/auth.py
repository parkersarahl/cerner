"""
Authentication router for login and user management.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
import os

# Import SECRET_KEY and ALGORITHM from utils/auth.py to keep them consistent
from utils.auth import SECRET_KEY, ALGORITHM

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Fake user database (replace with real database in production)
fake_users_db = {
    "provider": {
        "id": "user-001",
        "username": "provider@provider.com",
        "hashed_password": pwd_context.hash("provider"),
        "role": "provider"
    },
    "admin": {
        "id": "user-002",
        "username": "admin@admin.com",
        "hashed_password": pwd_context.hash("admin"),
        "role": "admin"
    }
}


class LoginInput(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(input: LoginInput):
    """
    Login endpoint - authenticates user and returns JWT token.
    
    Request body:
        {
            "username": "provider",  // or email
            "password": "provider"
        }
    
    Returns:
        {
            "access_token": "eyJ...",
            "token_type": "bearer"
        }
    """
    # Try direct key lookup first (username without @domain)
    user = fake_users_db.get(input.username)
    
    # If not found, try lookup by full email
    if not user:
        user = next(
            (u for u in fake_users_db.values() if u["username"] == input.username),
            None
        )

    # Verify user exists and password is correct
    if not user or not pwd_context.verify(input.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401, 
            detail="Invalid credentials"
        )

    # Create JWT token
    token_data = {
        "sub": user["username"],           # Subject (username)
        "roles": [user["role"]],           # User roles as array
        "user_id": user["id"],             # User ID
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),  # Expiration
        "iat": datetime.utcnow()           # Issued at
    }

    # Encode JWT
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    print(f"✅ User '{user['username']}' logged in with role '{user['role']}'")
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

