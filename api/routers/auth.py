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

    auth_url = f"{EPIC_AUTH_URL}?{query}"
    print("🔍 Epic Auth URL:", auth_url)  # <-- Debug print here

    return RedirectResponse(auth_url)

@router.get("/epic/callback")
async def epic_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code from Epic")

    try:
        token_response = EpicEHR.exchange_code_for_token(code)
        access_token = token_response.get("access_token")

        if not access_token:
            raise HTTPException(status_code=500, detail="No access_token returned")

        # For sandbox: redirect with token to frontend
        redirect_url = f"http://localhost:3000/search/epic?token={access_token}"
        return RedirectResponse(redirect_url)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")


@router.get("/logout")
async def logout(request: Request):
    """
    Logs out the user by clearing the session.
    """
    request.session.clear()
    return {"message": "Logged out successfully"}
