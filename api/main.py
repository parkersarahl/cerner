from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from routers import auth, epic_routes, patient, cerner_routes
from database import engine, Base


from starlette.middleware.sessions import SessionMiddleware
import os

app = FastAPI()


# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fhir-five.vercel.app",
        "http://localhost:3000"
    ],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(epic_routes.router, prefix="/api")
app.include_router(patient.router, prefix="/api")
app.include_router(cerner_routes.router, prefix="/api")
app.title = "ConnectEHR API"
app.version = "1.0.0"


# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", "dev-secret"))


#def init_db():
    #Base.metadata.create_all(bind=engine)

#@app.on_event("startup")
#def on_startup():
#    init_db()
