from getpass import getuser
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from routers import auth, epic_routes, patient, cerner_routes
from routers import epic_routes  # Ensure epic_routes is imported to register its
from starlette.middleware.sessions import SessionMiddleware
import os

app = FastAPI()
app.include_router(auth.router, prefix="/api")
app.include_router(epic_routes.router, prefix="/api")
app.include_router(patient.router, prefix="/api")
app.include_router(cerner_routes.router, prefix="/api")
app.title = "ConnectEHR API"
app.version = "1.0.0"


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

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", "dev-secret"))