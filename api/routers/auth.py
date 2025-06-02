# routers/auth.py

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
import urllib.parse
from services.ehr.epic import EpicEHR
import secrets


from config import (
    EPIC_CLIENT_ID,
    EPIC_REDIRECT_URI,
    EPIC_AUTH_URL,
    EPIC_SCOPES,
    EPIC_TOKEN_URL,
    EPIC_CLIENT_SECRET,
)

router = APIRouter()

state = secrets.token_urlsafe(16)  # Generate a secure random state

@router.get("/login")
async def login_to_epic():
    query = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": EPIC_CLIENT_ID,
        "redirect_uri": EPIC_REDIRECT_URI,
        "scope": EPIC_SCOPES,
        "state": state,
    })
    return RedirectResponse(f"{EPIC_AUTH_URL}?{query}")

@router.get("/auth/callback")
async def epic_auth_callback(request: Request, code: str = None, state: str = None):
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code not found")

    try:
        token_response = EpicEHR.exchange_code_for_token(code)
        access_token = token_response.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Access token not received")

        request.session["epic_access_token"] = access_token
        return HTMLResponse(
            content="<html><body><h1>Login Successful</h1><p>You can close this window.</p></body></html>",
            status_code=200,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")

@router.get("/logout")
async def logout(request: Request):
    """
    Logs out the user by clearing the session.
    """
    request.session.clear()
    return {"message": "Logged out successfully"}
