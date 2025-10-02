# cerner_routes.py
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
import httpx
import secrets
import urllib.parse
from config import (
    CERNER_CLIENT_ID,
    CERNER_CLIENT_SECRET,
    CERNER_REDIRECT_URI,
    CERNER_AUTH_URL,
    CERNER_TOKEN_URL,
    CERNER_SCOPES
)

router = APIRouter(prefix="/cerner")  # router prefix for /cerner

# Store temporary state per session (in-memory for demo; replace with DB or session in prod)
STATE_STORE = {}

@router.get("/login")
async def cerner_login(request: Request):
    # Generate a per-request state
    state = secrets.token_urlsafe(16)
    # Store state keyed by client IP (or session ID)
    STATE_STORE[request.client.host] = state

    params = {
        "client_id": CERNER_CLIENT_ID,
        "redirect_uri": CERNER_REDIRECT_URI,  # Must match exactly what's in Cerner portal
        "response_type": "code",
        "scope": CERNER_SCOPES,
        "state": state,
    }
    url = f"{CERNER_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@router.get("/callback")
async def cerner_callback(
    request: Request,
    code: str,
    state: str = Query(None)
):
    # Validate state
    expected_state = STATE_STORE.get(request.client.host)
    if state != expected_state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    # Clean up state
    STATE_STORE.pop(request.client.host, None)

    # Exchange code for tokens
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": CERNER_REDIRECT_URI,
        "client_id": CERNER_CLIENT_ID,
        "client_secret": CERNER_CLIENT_SECRET
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    async with httpx.AsyncClient() as client:
        token_response = await client.post(CERNER_TOKEN_URL, data=data, headers=headers)

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=token_response.status_code,
            detail=f"Token exchange failed: {token_response.text}"
        )

    return token_response.json()
