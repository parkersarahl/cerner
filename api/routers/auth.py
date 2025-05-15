# routers/auth.py

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
import urllib.parse
import httpx
from services.ehr.epic import EpicEHR

from config import (
    EPIC_CLIENT_ID,
    EPIC_REDIRECT_URI,
    EPIC_AUTH_URL,
    EPIC_SCOPES,
    EPIC_TOKEN_URL,
    EPIC_CLIENT_SECRET,
)

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
async def epic_auth_callback(request: Request, code: str = None, state: str = None):
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code not found")

    try:
        # Exchange code for token
        token_response = EpicEHR.exchange_code_for_token(code)
        access_token = token_response.get("access_token")
        id_token = token_response.get("id_token")  # optional, contains user info

        if not access_token:
            raise HTTPException(status_code=400, detail="Access token not received")

        # Store the token in session
        request.session["epic_access_token"] = access_token

        return RedirectResponse(url="/me")  # or wherever you want to land the user

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")


@router.get("/callback")
async def auth_callback(request: Request):
    code = request.query_params.get("code")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    # Exchange code for token
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
        raise HTTPException(status_code=500, detail="Token exchange failed")

    token_response = response.json()

    # ✅ Store in session
    request.session["epic_access_token"] = token_response["access_token"]

    return {"message": "Epic auth successful", "access_token": token_response["access_token"]}

@router.get("/logout")
async def logout(request: Request):
    """
    Logs out the user by clearing the session.
    """
    request.session.clear()
    return {"message": "Logged out successfully"}
