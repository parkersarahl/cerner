from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from services.ehr.epic import EpicEHR
from utils.auth import get_current_user_token  # We'll add this below

router = APIRouter()

