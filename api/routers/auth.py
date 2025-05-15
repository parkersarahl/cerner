# routers/auth.py

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
import urllib.parse
import httpx


from config import (
    EPIC_CLIENT_ID,
    EPIC_REDIRECT_URI,
    EPIC_AUTH_URL,
    EPIC_SCOPES,
    EPIC_TOKEN_URL,
    EPIC_CLIENT_SECRET,
)
from utils.auth import exchange_code_for_token

router = APIRouter()


@router.get("/login")
async def login_to_epic():
    query = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": EPIC_CLIENT_ID,
        "redirect_uri": EPIC_REDIRECT_URI,
        "scope": EPIC_SCOPES,
        "state": "secure_random_state",  # Replace with a secure random state
    })
    return RedirectResponse(f"{EPIC_AUTH_URL}?{query}")

@router.get("/auth/callback")
async def auth_callback(request: Request):
    code = request.query_params.get("code")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": EPIC_REDIRECT_URI,
        "client_id": EPIC_CLIENT_ID,
        "client_secret": EPIC_CLIENT_SECRET,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(EPIC_TOKEN_URL, data=token_data)

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {response.text}")

    token_response = response.json()

    return {
        "access_token": token_response["access_token"],
        "id_token": token_response.get("id_token"),
        "expires_in": token_response.get("expires_in"),
        "token_type": token_response.get("token_type"),
        "scope": token_response.get("scope")
    }
