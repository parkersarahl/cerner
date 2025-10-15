from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from database import Base, engine
from sqlalchemy import inspect
from models import audit_log
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

app.include_router(patient.router, prefix="/api")
app.include_router(auth.router)
app.include_router(cerner_routes.router)
app.include_router(EpicRoutes.router)
app.title = "ConnectEHR API"
app.version = "1.0.0"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", "dev-secret"))

def init_db():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    
@app.on_event("startup")
def on_startup():
    print("=" * 50)
    print("🚀 Starting application...")
    print("=" * 50)
    
    # Test database connection
    try:
        with engine.connect() as conn:
            print("✅ Database connection successful!")
            print(f"📊 Database URL: {engine.url}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return
    
    # Create tables
    try:
        print("\n📝 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # List all tables that were created
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"✅ Tables in database: {tables}")
        
        if 'audit_logs' in tables:
            print("✅ audit_logs table created successfully!")
        else:
            print("❌ audit_logs table NOT created!")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
    
    print("=" * 50)