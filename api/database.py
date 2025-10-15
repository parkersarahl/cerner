# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import Depends 

# Use your actual DB URL here (e.g., PostgreSQL or SQLite)
DATABASE_URL = "postgresql://postgres:connectehr2025@db.dnvsfxacpzpegudetaqf.supabase.co:5432/postgres"



engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
