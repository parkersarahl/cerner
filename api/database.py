# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import Depends 

# Use your actual DB URL here (e.g., PostgreSQL or SQLite)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Carol2024%23@localhost:5432/connectehr"


engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
