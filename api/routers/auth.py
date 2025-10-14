from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

from utils.auth import SECRET_KEY, ALGORITHM

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Fake user database
fake_users_db = {
    "provider": {
        "id": "user-001",
        "username": "provider",
        "hashed_password": pwd_context.hash("provider"),
        "role": "provider"
    },
    "admin": {
        "id": "user-002",
        "username": "admin",
        "hashed_password": pwd_context.hash("admin"),
        "role": "admin"
    }
}

class LoginInput(BaseModel):
    username: str
    password: str

@router.post("/auth/login")
def login(input: LoginInput):
    user = fake_users_db.get(input.username)
    if not user or not pwd_context.verify(input.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {
        "sub": input.username,
        "roles": [user["role"]],
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }

    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}
