# cerner_routes.py
import datetime
from fastapi import APIRouter, Request, HTTPException, Query, Header
from fastapi.responses import RedirectResponse
import httpx
import secrets
import urllib.parse

from jose import JWTError
from config import (
    CERNER_CLIENT_ID,
    CERNER_CLIENT_SECRET,
    CERNER_TENANT_ID,
)
with open("C:\\Users\\sarah\\Desktop\\private_key.pem", "r") as f:
    PRIVATE_KEY = f.read()

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
CERNER_SCOPES = "openid fhirUser offline_access user/Patient.read user/Observation.read user/Practitioner.read"

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
        resp = await client.post(CERNER_TOKEN_URL, data=data, headers=headers, auth=auth)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Token exchange failed: {resp.text}"
        )
    token_json = resp.json()
    access_token = token_json.get("access_token")
    redirect_url = f"http://localhost:3000/search/cerner?token={access_token}&{state}"
    return RedirectResponse(redirect_url)
    #return token_response.json()

@router.get("/patient")
async def search_patients(
    person_id: str = Query(None, description="Patient ID"),
    name: str = Query(None, description="Patient name"),
    authorization: str = Header(None)
):
    """
    Search Cerner FHIR patients by ID or name. Pass Bearer token in Authorization header.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    access_token = authorization.split(" ")[1]
    base_url = f"https://fhir-ehr.cerner.com/r4/{CERNER_TENANT_ID}/Patient"
    headers = {
        "Accept": "application/fhir+json",
        "Authorization": f"Bearer {access_token}"
    }

    query_params = {}
    if person_id:
        query_params["_id"] = person_id    # Cerner uses _id for specific patient search
    if name:
        query_params["name"] = name        # Optional: search by name

    async with httpx.AsyncClient() as client:
        response = await client.get(base_url, headers=headers, params=query_params)
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to search patients: {response.text}"
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
