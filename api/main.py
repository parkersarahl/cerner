from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from routers import auth, patient, cerner_routes, EpicRoutes
from starlette.middleware.sessions import SessionMiddleware
import os

app = FastAPI()

# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cerner-chi.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patient.router, prefix="/api")
app.include_router(cerner_routes.router)
app.include_router(EpicRoutes.router)
app.title = "ConnectEHR API"
app.version = "1.0.0"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", "dev-secret"))

# ✅ Root health check for Render
@app.get("/")
def read_root():
    return {"status": "ok", "message": "ConnectEHR API is running 🚀"}
