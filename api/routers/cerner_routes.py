# cerner_routes.py
import datetime
from fastapi import APIRouter, Request, HTTPException, Query, Header, Response, Depends
from fastapi.responses import RedirectResponse
import httpx
import secrets
import urllib.parse
import base64

from requests import Session
from database import get_db
from utils.auth import require_role, get_current_user
from utils.audit_logger import log_audit_event


from jose import JWTError
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
CERNER_REDIRECT_URI = "https://cerner.onrender.com/cerner/callback"
CERNER_CLIENT_ID = "5926dd25-fd35-4807-8273-5aaf77360167"
CERNER_CLIENT_SECRET = "MoSCsvLuwWAatHS70vVkyM9C8SmPjUvW"
CERNER_TENANT_ID = "ec2458f2-1e24-41c8-b71b-0e701af7583d"
# Define SMART scopes for Cerner
CERNER_SCOPES = "openid fhirUser offline_access user/Patient.read user/Observation.read user/Practitioner.read user/DiagnosticReport.read user/DocumentReference.read user/Binary.read"

# Simple in-memory state store (replace with redis/db in production)
STATE_STORE = {}


# ========== PUBLIC ROUTES (OAuth Flow) ==========

@router.get("/login")
async def cerner_login(request: Request):
    """
    PUBLIC: Redirects to Cerner authorization endpoint for SMART on FHIR launch.
    No authentication required.
    """
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
    """
    PUBLIC: Handles Cerner OAuth2 callback and exchanges code for tokens.
    Cerner redirects here after user authentication.
    """
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
    redirect_url = f"https://cerner-chi.vercel.app/search/cerner?token={access_token}"
    if state:
        redirect_url += f"&state={state}"
    return RedirectResponse(redirect_url)


# ========== PROTECTED ROUTES (Require Provider/Admin Role) ==========

@router.get("/patient")
async def search_patients(
    person_id: str = Query(None, description="Patient ID"),
    name: str = Query(None, description="Patient name"),
    cerner_authorization: str = Header(..., alias="Cerner-Authorization"),
    current_user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db),
):
    """
    Search Cerner FHIR patients by ID or name.
    
    Requires TWO tokens:
    - Authorization: Bearer <YOUR_JWT_TOKEN> (auto-checked by require_role)
    - Cerner-Authorization: Bearer <CERNER_TOKEN> (for Cerner API)
    """
    if not cerner_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Cerner-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = cerner_authorization.split(" ")[1]
    
    base_url = f"https://fhir-ehr.cerner.com/r4/{CERNER_TENANT_ID}/Patient"
    headers = {
        "Accept": "application/fhir+json",
        "Authorization": f"Bearer {access_token}"
    }
    
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="searched patients",
        resource_type="Patient",
        resource_id=None
    )
    
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


@router.get("/patient/{patient_id}")
async def get_patient_by_id(
    patient_id: str,
    cerner_authorization: str = Header(..., alias="Cerner-Authorization"),
    current_user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db),
):
    """
    Get specific patient by ID.
    Requires provider or admin role.
    """
    if not cerner_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Cerner-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = cerner_authorization.split(" ")[1]

    url = f"https://fhir-ehr.cerner.com/r4/{CERNER_TENANT_ID}/Patient/{patient_id}"
    headers = {"Accept": "application/fhir+json", "Authorization": f"Bearer {access_token}"}
    
    username = current_user.get("sub", "unknown")
    # Print basic log to backend console
    print(f"User '{username}' accessing patient {patient_id}")
    
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="viewed patient details",
        resource_type="Patient",
        resource_id=patient_id
    )
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"Patient {patient_id} not found")

    return response.json()


@router.get("/observations/{patient_id}")
async def get_observations(
    patient_id: str,
    cerner_authorization: str = Header(..., alias="Cerner-Authorization"),
    current_user: dict = Depends(require_role(["provider"])),
    db: Session = Depends(get_db),
):
    """
    Fetch Observations for a given patient.
    Requires provider role.
    """
    if not cerner_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Cerner-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = cerner_authorization.split(" ")[1]
    
    fhir_url = f"https://fhir-ehr.cerner.com/r4/{CERNER_TENANT_ID}/Observation"
    headers = {
        "Accept": "application/fhir+json",
        "Authorization": f"Bearer {access_token}"
    }
    params = {"patient": patient_id}
    
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="viewed observations",
        resource_type="Observation",
        resource_id=None
    )

    async with httpx.AsyncClient() as client:
        response = await client.get(fhir_url, headers=headers, params=params)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to fetch observations: {response.text}"
        )

    return response.json()


@router.get("/diagnostic-reports/{report_type}")
async def get_cerner_diagnostic_reports(
    report_type: str,
    patient: str,
    cerner_authorization: str = Header(..., alias="Cerner-Authorization"),
    current_user: dict = Depends(require_role(["provider"])),
    db: Session = Depends(get_db),
):
    """
    Get diagnostic reports by type.
    Requires provider role.
    """
    if not cerner_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Cerner-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = cerner_authorization.split(" ")[1]

    # Map frontend report type to Cerner FHIR category codes
    category_map = {
        "radiology": "RAD",
        "labs": "LAB",
        "clinical": "CLIN",
    }
    category_code = category_map.get(report_type.lower())
    if not category_code:
        raise HTTPException(status_code=400, detail="Invalid report type")

    url = f"{CERNER_AUDIENCE_URL}/DiagnosticReport?patient={patient}&category={category_code}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/fhir+json"
    }
    
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="pulled diagnostic reports",
        resource_type="DiagnosticReport",
        resource_id=None
    )
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Cerner FHIR diagnostic reports retrieval failed: {response.text}"
        )

    return response.json()


# ------------------- Document References -------------------
@router.get("/document-references/{doc_type}")
async def get_cerner_document_references(
    doc_type: str,
    patient: str,
    cerner_authorization: str = Header(..., alias="Cerner-Authorization"),
    current_user: dict = Depends(require_role(["provider"])),
    db: Session = Depends(get_db),
):
    """
    Fetch DocumentReference resources from Cerner FHIR API.
    doc_type can be 'clinical' or other types as needed.
    Requires provider role.
    """
    if not cerner_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Cerner-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = cerner_authorization.split(" ")[1]

    # Build the DocumentReference query
    url = f"{CERNER_AUDIENCE_URL}/DocumentReference?patient={patient}"
    
    # Optional: Add type filtering if needed
    # For clinical notes, you might want to add: &type=clinical-note
    if doc_type.lower() == "clinical":
        url += "&type=http://loinc.org|11488-4"  # Clinical Note type code
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/fhir+json"
    }
    
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="pulled document references",
        resource_type="DocumentReference",
        resource_id=None
    )
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Cerner FHIR document references retrieval failed: {response.text}"
        )

    return response.json()


# ------------------- Binary -------------------
@router.get("/binary/{binary_id}")
async def get_cerner_binary(
    binary_id: str,
    cerner_authorization: str = Header(..., alias="Cerner-Authorization"),
    current_user: dict = Depends(require_role(["provider"]))
):
    """
    Get binary resource (documents, images).
    Requires provider role.
    """
    if not cerner_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Cerner-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = cerner_authorization.split(" ")[1]

    base_url = f"{CERNER_AUDIENCE_URL}/Binary/{binary_id}"
    
    # Try with Accept: application/fhir+json first to get the FHIR Binary resource
    headers = {
        "Authorization": f"Bearer {access_token}", 
        "Accept": "application/fhir+json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(base_url, headers=headers)

    # Log the full response for debugging
    print(f"Binary request to: {base_url}")
    print(f"Status code: {response.status_code}")
    print(f"Response headers: {response.headers}")
    print(f"Response body preview: {response.text[:500] if response.text else 'empty'}")

    if response.status_code == 403:
        # 403 might mean insufficient scopes or the Binary resource requires different access
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to Binary resource. You may need user/Binary.read scope. Error: {response.text}"
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Cerner FHIR binary retrieval failed: {response.text}"
        )

    # Check if response is JSON (FHIR Binary resource) or raw binary data
    content_type_header = response.headers.get("content-type", "")
    
    if "application/fhir+json" in content_type_header or "application/json" in content_type_header:
        # Response is a FHIR Binary resource with base64 encoded content
        binary_resource = response.json()
        content_base64 = binary_resource.get("content") or binary_resource.get("data")
        content_type = binary_resource.get("contentType", "application/octet-stream")

        if not content_base64:
            raise HTTPException(status_code=404, detail="Binary content not found in FHIR resource")

        binary_data = base64.b64decode(content_base64)
        return Response(content=binary_data, media_type=content_type)
    else:
        # Response is raw binary data
        return Response(content=response.content, media_type=content_type_header or "application/octet-stream")