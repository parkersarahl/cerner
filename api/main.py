from getpass import getuser
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from utils.auth import (
    verify_password,
    create_access_token,
    decode_access_token,
    hash_password  
)

from routers import auth
from routers.epic import router as epic_router
from starlette.middleware.sessions import SessionMiddleware
import os

app = FastAPI()

# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adjust if deployed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Register the router
app.include_router(auth.router)
app.include_router(epic_router, prefix="/api")  # optional: prefix all routes

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", "dev-secret"))