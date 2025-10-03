# cerner_routes.py
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import RedirectResponse
import httpx
import secrets
import urllib.parse
from config import (
    CERNER_CLIENT_ID,
    CERNER_CLIENT_SECRET,
    CERNER_TENANT_ID,
)

router = APIRouter(prefix="/cerner")

# OAuth2 endpoints (tenant-specific for Cerner sandbox)
CERNER_AUTH_URL = f"https://authorization.cerner.com/tenants/{CERNER_TENANT_ID}/protocols/oauth2/profiles/smart-v1/personas/provider/authorize"
CERNER_TOKEN_URL = f"https://authorization.cerner.com/tenants/{CERNER_TENANT_ID}/protocols/oauth2/profiles/smart-v1/token"
CERNER_AUDIENCE_URL = f"https://fhir-ehr.cerner.com/r4/{CERNER_TENANT_ID}"
CERNER_REDIRECT_URI = "http://localhost:8000/cerner/callback"
CERNER_CLIENT_ID = "5926dd25-fd35-4807-8273-5aaf77360167"
CERNER_CLIENT_SECRET = "MoSCsvLuwWAatHS70vVkyM9C8SmPjUvW"
CERNER_TENANT_ID = "ec2458f2-1e24-41c8-b71b-0e701af7583d"
# Define SMART scopes for Cerner
CERNER_SCOPES = "openid fhirUser offline_access"

# Simple in-memory state store (replace with redis/db in production)
STATE_STORE = {}

@router.get("/login")
async def cerner_login(request: Request):
    """Redirects to Cerner authorization endpoint for SMART on FHIR launch"""
    state = secrets.token_urlsafe(16)
    STATE_STORE[request.client.host] = state

    params = {
        "client_id": CERNER_CLIENT_ID,
        "redirect_uri": CERNER_REDIRECT_URI,
        "response_type": "code",
        "scope": CERNER_SCOPES,
        "state": state,
        "aud": CERNER_AUDIENCE_URL,  # audience required by Cerner
    }
    print("CERNER_AUTH_URL:", CERNER_AUTH_URL)
    url = f"{CERNER_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


@router.get("/callback")
async def cerner_callback(
    request: Request,
    code: str,
    state: str = Query(None)
):
    """Handles Cerner OAuth2 callback and exchanges code for tokens"""
    expected_state = STATE_STORE.get(request.client.host)
    if state != expected_state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    STATE_STORE.pop(request.client.host, None)

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": CERNER_REDIRECT_URI,
        "client_id": CERNER_CLIENT_ID,
        "client_secret": CERNER_CLIENT_SECRET,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    auth = (CERNER_CLIENT_ID, CERNER_CLIENT_SECRET)

    async with httpx.AsyncClient() as client:
        token_response = await client.post(CERNER_TOKEN_URL, data=data, headers=headers, auth=auth)

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=token_response.status_code,
            detail=f"Token exchange failed: {token_response.text}"
        )

    return token_response.json()


@router.get("/patient/{patient_id}")
async def get_patient(patient_id: str, access_token: str):
    """Fetch a Patient resource from Cerner FHIR"""
    fhir_url = f"https://fhir-ehr.cerner.com/r4/{CERNER_TENANT_ID}/Patient/{patient_id}"
    headers = {
        "Accept": "application/fhir+json",
        "Authorization": f"Bearer {access_token}"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(fhir_url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to fetch patient: {response.text}"
        )

    return response.json()


@router.get("/practitioner/{practitioner_id}")
async def get_practitioner(practitioner_id: str, access_token: str):
    """Fetch a Practitioner resource"""
    fhir_url = f"https://fhir-ehr.cerner.com/r4/{CERNER_TENANT_ID}/Practitioner/{practitioner_id}"
    headers = {
        "Accept": "application/fhir+json",
        "Authorization": f"Bearer {access_token}"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(fhir_url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to fetch practitioner: {response.text}"
        )

    return response.json()


@router.get("/observations/{patient_id}")
async def get_observations(patient_id: str, access_token: str):
    """Fetch Observations for a given patient"""
    fhir_url = f"https://fhir-ehr.cerner.com/r4/{CERNER_TENANT_ID}/Observation"
    headers = {
        "Accept": "application/fhir+json",
        "Authorization": f"Bearer {access_token}"
    }
    params = {"patient": patient_id}

    async with httpx.AsyncClient() as client:
        response = await client.get(fhir_url, headers=headers, params=params)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to fetch observations: {response.text}"
        )

    return response.json()
