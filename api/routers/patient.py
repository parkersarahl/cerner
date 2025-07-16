from fastapi import APIRouter, Depends
from utils.auth import get_current_user

router = APIRouter()

@router.get("/secure-data")
def secure_endpoint(current_user=Depends(get_current_user)):
    return {"message": f"Hello {current_user['sub']}!"}
