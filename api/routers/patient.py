from fastapi import APIRouter, Depends
from utils.auth import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter()

@router.get("/secure-data")
def secure_endpoint(current_user=Depends(get_current_user)):
    return {"message": f"Hello {current_user['sub']}!"}

@router.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        # Simple raw SQL query just to check connectivity
        result = db.execute(text("SELECT 1")).scalar()
        if result == 1:
            return {"status": "success", "message": "Database connection is working!"}
        else:
            return {"status": "fail", "message": "Unexpected result from DB"}
    except Exception as e:
        return {"status": "fail", "message": str(e)}