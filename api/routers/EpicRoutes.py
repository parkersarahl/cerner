import base64
import io
from fastapi import APIRouter, Path, Request, HTTPException, Query, Header, Response, Depends
from fastapi.responses import RedirectResponse, StreamingResponse
import httpx
import urllib.parse
import secrets

from requests import Session
from database import get_db
from routers.epicBase import EpicEHR
from utils.auth import require_role, get_current_user
from utils.audit_logger import log_audit_event

EPIC_CLIENT_ID = "b3d4de6f-fff6-45cb-ad65-eff1c502c2c1"
EPIC_REDIRECT_URI = "https://cerner.onrender.com/epic/callback"
EPIC_SCOPES = "openid fhirUser profile user/*.read offline_access"
EPIC_AUTH_URL = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize"
EPIC_TOKEN_URL = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
EPIC_FHIR_BASE_URL = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"

router = APIRouter()
state = secrets.token_urlsafe(16)

# ========== PUBLIC ROUTES (OAuth Flow) ==========

@router.get("/epic/login")
async def login_to_epic():
    """
    PUBLIC: Initiates Epic OAuth flow.
    No authentication required.
    """
    query = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": EPIC_CLIENT_ID,
        "redirect_uri": EPIC_REDIRECT_URI,
        "scope": EPIC_SCOPES,
        "state": state,
    })
    auth_url = f"{EPIC_AUTH_URL}?{query}"
    print("Auth URL:", auth_url)
    return RedirectResponse(auth_url)


@router.get("/epic/callback")
async def epic_callback(request: Request):
    """
    PUBLIC: Epic OAuth callback.
    Epic redirects here after user authentication.
    """
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    if not code:
        raise HTTPException(status_code=400, detail="Missing code from Epic")

    try:
        token_data = await EpicEHR.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        if not access_token:
            raise Exception("No access_token in token response")
    except Exception as e:
        print("Epic token exchange failed:", e)
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")

    redirect_url = f"https://cerner-chi.vercel.app/search/epic?token={access_token}"
    if state:
        redirect_url += f"&state={state}"

    return RedirectResponse(redirect_url)


# ========== PROTECTED ROUTES (Require Provider/Admin Role) ==========

@router.get("/epic/patient")
async def search_patients(
    patient_id: str = Query(None, description="FHIR Patient ID"),
    name: str = Query(None, description="Patient name"),
    epic_token: str = Header(..., alias="Epic-Authorization"),
    current_user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Search Epic FHIR patients.
    
    Requires TWO tokens:
    - Authorization: Bearer <YOUR_JWT_TOKEN> (auto-checked by require_role)
    - Epic-Authorization: Bearer <EPIC_TOKEN> (for Epic API)
    """
    if not epic_token.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Epic-Authorization header must be 'Bearer <token>'"
        )

    access_token = epic_token.split(" ")[1]
    
    # Log who accessed
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="searched patients",
        resource_type="Patient",
        resource_id=None
    )


    base_url = f"{EPIC_FHIR_BASE_URL}/Patient"
    headers = {
        "Accept": "application/fhir+json",
        "Authorization": f"Bearer {access_token}",
    }

    query_params = {}
    if patient_id:
        query_params["_id"] = patient_id
    if name:
        query_params["name"] = name

    async with httpx.AsyncClient() as client:
        response = await client.get(base_url, headers=headers, params=query_params)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Epic FHIR patient search failed: {response.text}",
        )

    return response.json()


@router.get("/epic/patient/{patient_id}")
async def get_patient_by_id(
    patient_id: str,
    epic_token: str = Header(..., alias="Epic-Authorization"),
    current_user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Get specific patient by ID.
    Requires provider or admin role.
    """
    if not epic_token.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Epic-Authorization header must be 'Bearer <token>'"
        )

    access_token = epic_token.split(" ")[1]
    
    username = current_user.get("sub", "unknown")
    #Print basic log to backend console
    print(f"User '{username}' accessing patient {patient_id}")
    # Log who accessed in database
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="searched patients",
        resource_type="Patient",
        resource_id=None
    )

    url = f"{EPIC_FHIR_BASE_URL}/Patient/{patient_id}"
    headers = {
        "Accept": "application/fhir+json",
        "Authorization": f"Bearer {access_token}"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Patient {patient_id} not found: {response.text}"
        )

    return response.json()


@router.get("/epic/documentReferences")
async def get_epic_document_references(
    patientId: str = Query(..., description="Patient ID"),
    type: str = Query(..., description="Document type: radiology, lab, or clinical"),
    epic_token: str = Header(..., alias="Epic-Authorization"),
    current_user: dict = Depends(require_role(["provider"])),
    db: Session = Depends(get_db)
):
    """
    Fetch DocumentReference resources from Epic.
    Requires provider role.
    """
    if not epic_token.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Epic-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = epic_token.split(" ")[1]

    type_map = {
        "radiology": "http://loinc.org|18748-4",
        "lab": "http://loinc.org|11502-2",
        "clinical": "http://loinc.org|11488-4",
    }
    
    type_code = type_map.get(type.lower())
    
    url = f"{EPIC_FHIR_BASE_URL}/DocumentReference?patient={patientId}"
    if type_code:
        url += f"&type={type_code}"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/fhir+json"
    }
    
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="pulled document references",
        resource_type="Patient",
        resource_id=None
    )
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Epic FHIR document references retrieval failed: {response.text}"
        )

    return response.json()


@router.get("/epic/diagnostic-reports/{report_type}")
async def get_epic_diagnostic_reports(
    report_type: str,
    patient: str,
    epic_token: str = Header(..., alias="Epic-Authorization"),
    current_user: dict = Depends(require_role(["provider"])),
    db: Session = Depends(get_db)
):
    """
    Get diagnostic reports by type.
    Requires provider role.
    """
    if not epic_token.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Epic-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = epic_token.split(" ")[1]

    category_map = {
        "radiology": "RAD",
        "labs": "LAB",
        "clinical": "CLIN",
    }
    category_code = category_map.get(report_type.lower())
    if not category_code:
        raise HTTPException(status_code=400, detail="Invalid report type")

    url = f"{EPIC_FHIR_BASE_URL}/DiagnosticReport?patient={patient}&category={category_code}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/fhir+json"
    }
    log_audit_event(
        db=db,
        user_id=current_user.get("sub"),
        action="opened diagnostic reports",
        resource_type="Patient",
        resource_id=None
    )

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Epic FHIR diagnostic reports retrieval failed: {response.text}"
        )

    return response.json()


@router.get("/epic/binary/{binary_id}")
async def get_epic_binary(
    binary_id: str,
    epic_token: str = Header(..., alias="Epic-Authorization"),
    current_user: dict = Depends(require_role(["provider"]))
):
    """
    Get binary resource (documents, images).
    Requires provider role.
    """
    if not epic_token.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Epic-Authorization header must be 'Bearer <token>'"
        )
    
    access_token = epic_token.split(" ")[1]

    base_url = f"{EPIC_FHIR_BASE_URL}/Binary/{binary_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "*/*"
    }

    print(f"Fetching Epic Binary: {base_url}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(base_url, headers=headers)

    print(f"Epic Binary response status: {response.status_code}")
    
    if response.status_code == 403:
        print("Got 403, trying open endpoint...")
        open_url = f"https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Binary/{binary_id}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            open_response = await client.get(open_url, headers={"Accept": "*/*"})
        
        if open_response.status_code == 200:
            response = open_response
        else:
            raise HTTPException(
                status_code=403,
                detail="Epic sandbox Binary resources are restricted."
            )
    
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Binary resource not found: {binary_id}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Epic FHIR binary retrieval failed: {response.text[:200]}"
        )

    content_type_header = response.headers.get("content-type", "")
    
    if "application/fhir+json" in content_type_header or "application/json" in content_type_header:
        try:
            binary_resource = response.json()
            content_base64 = binary_resource.get("content") or binary_resource.get("data")
            content_type = binary_resource.get("contentType", "text/html")

            if not content_base64:
                raise HTTPException(
                    status_code=404,
                    detail=f"Binary content field not found"
                )

            binary_data = base64.b64decode(content_base64)
            return Response(content=binary_data, media_type=content_type)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse binary: {str(e)}")
    else:
        return Response(content=response.content, media_type=content_type_header or "text/html")


@router.post("/epic/audit/log-view")
async def log_epic_resource_view(
    patient_id: str = Query(...),
    resource_id: str = Query(...),
    resource_type: str = Query(...),
    action: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Log resource access for audit purposes.
    Requires valid JWT token (any authenticated user).
    """
    user_id = current_user.get('sub', 'unknown')
    user_roles = current_user.get('roles', [])
    
    print(f"AUDIT: User {user_id} (roles: {user_roles}) {action} {resource_type} {resource_id} for patient {patient_id}")
    
    return {
        "status": "logged",
        "message": "Resource view logged successfully",
        "user": user_id
    }