from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from routers import auth, patient, cerner_routes, EpicRoutes
from starlette.middleware.sessions import SessionMiddleware
import os
from database import Base, engine

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

app.include_router(patient.router, prefix="/api")
app.include_router(auth.router)
app.include_router(cerner_routes.router)
app.include_router(EpicRoutes.router)
app.title = "ConnectEHR API"
app.version = "1.0.0"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", "dev-secret"))


@app.on_event("startup")
def startup():
    print("=" * 50)
    print("🚀 Starting ConnectEHR API...")
    print("=" * 50)
    
    try:
        print("📝 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
        print(f"📊 Connected to: {engine.url}")
    except Exception as e:
        print(f"❌ Database error: {e}")
    
    print("=" * 50)