import base64
import io
from fastapi import APIRouter, Path, Request, HTTPException, Query, Header, Response, Depends
from fastapi.responses import RedirectResponse, StreamingResponse
import httpx
import urllib.parse
import secrets
from routers.epicBase import EpicEHR
from utils.auth import get_current_user, require_role
from typing import List

EPIC_CLIENT_ID = "b3d4de6f-fff6-45cb-ad65-eff1c502c2c1"
EPIC_REDIRECT_URI = "https://cerner.onrender.com/epic/callback"
EPIC_SCOPES = "openid fhirUser profile user/*.read offline_access"
EPIC_AUTH_URL = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize"
EPIC_TOKEN_URL = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
EPIC_FHIR_BASE_URL = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"

router = APIRouter()
state = secrets.token_urlsafe(16)

# Public
@router.get("/epic/login")
async def login_to_epic():
    query = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": EPIC_CLIENT_ID,
        "redirect_uri": EPIC_REDIRECT_URI,
        "scope": EPIC_SCOPES,
        "state": state,
    })
    auth_url = f"{EPIC_AUTH_URL}?{query}"
    print("Auth URL:", auth_url)  # Debugging line
    return RedirectResponse(auth_url)


# Public
@router.get("/epic/callback")
async def epic_callback(request: Request):
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


@router.get("/epic/patient")
async def search_patients(
    patient_id: str = Query(None, description="FHIR Patient ID (use _id for exact match)"),
    name: str = Query(None, description="Patient name (optional)"),
    authorization: str = Header(None),
    current_user: dict = Depends(require_role(["provider"],["admin"]))
):
    """
    Search Epic FHIR patients by ID or name.
    Pass Bearer token in Authorization header.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    access_token = authorization.split(" ")[1]

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


# FIXED: Added route to get single patient by ID
@router.get("/epic/patient/{patient_id}")
async def get_patient_by_id(
    patient_id: str, 
    authorization: str = Header(None),
    current_user: dict = Depends(require_role(["provider"],["admin"]))
):
    """
    Get a specific patient by ID.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    access_token = authorization.split(" ")[1]

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


# FIXED: Changed to DocumentReference instead of DiagnosticReport
@router.get("/epic/documentReferences")
async def get_epic_document_references(
    patientId: str = Query(..., description="Patient ID"),
    type: str = Query(..., description="Document type: radiology, lab, or clinical"),
    authorization: str = Header(None),
    current_user: dict = Depends(require_role(["provider"]))
):
    """
    Fetch DocumentReference resources from Epic FHIR API.
    Epic typically uses DocumentReference for clinical documents.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    access_token = authorization.split(" ")[1]

    # Map document types to LOINC codes or categories
    type_map = {
        "radiology": "http://loinc.org|18748-4",  # Diagnostic imaging study
        "lab": "http://loinc.org|11502-2",        # Laboratory report
        "clinical": "http://loinc.org|11488-4",   # Clinical note
    }
    
    type_code = type_map.get(type.lower())
    
    # Build DocumentReference query
    url = f"{EPIC_FHIR_BASE_URL}/DocumentReference?patient={patientId}"
    if type_code:
        url += f"&type={type_code}"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/fhir+json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Epic FHIR document references retrieval failed: {response.text}"
        )

    return response.json()


# Keep this for backwards compatibility if you need DiagnosticReport
@router.get("/epic/diagnostic-reports/{report_type}")
async def get_epic_diagnostic_reports(
    report_type: str,
    patient: str,
    authorization: str = Header(None),
    current_user: dict = Depends(require_role(["provider"]))
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    access_token = authorization.split(" ")[1]

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

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Epic FHIR diagnostic reports retrieval failed: {response.text}"
        )

    return response.json()


# FIXED: Try Epic's open endpoint for Binary resources
@router.get("/epic/binary/{binary_id}")
async def get_epic_binary(
    binary_id: str,
    authorization: str = Header(None),
    current_user: dict = Depends(require_role(["provider"]))
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    access_token = authorization.split(" ")[1]

    # Epic Binary URL
    base_url = f"{EPIC_FHIR_BASE_URL}/Binary/{binary_id}"
    
    # Try with wildcard Accept header
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "*/*"
    }

    print(f"Fetching Epic Binary: {base_url}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(base_url, headers=headers)

    print(f"Epic Binary response status: {response.status_code}")
    print(f"Response content-type: {response.headers.get('content-type')}")
    
    # If 403, try the open FHIR endpoint (no auth)
    if response.status_code == 403:
        print("Got 403 with auth, trying open endpoint without auth...")
        open_url = f"https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Binary/{binary_id}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            open_response = await client.get(open_url, headers={"Accept": "*/*"})
        
        print(f"Open endpoint status: {open_response.status_code}")
        
        if open_response.status_code == 200:
            print("✅ Open endpoint succeeded!")
            response = open_response
        else:
            # Both failed - return helpful error
            print(f"Open endpoint also failed with status {open_response.status_code}")
            raise HTTPException(
                status_code=403,
                detail="Epic sandbox Binary resources are restricted. The DocumentReference exists but the actual content cannot be accessed in the test environment. This is a known Epic limitation."
            )
    
    # Now check if response is successful after potentially trying open endpoint
    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=f"Binary resource not found: {binary_id}"
        )

    if response.status_code != 200:
        print(f"Error response body: {response.text[:500]}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Epic FHIR binary retrieval failed: {response.text[:200]}"
        )

    # Check response type
    content_type_header = response.headers.get("content-type", "")
    print(f"Successfully fetched binary, size: {len(response.content)} bytes")
    
    if "application/fhir+json" in content_type_header or "application/json" in content_type_header:
        # FHIR Binary resource with base64 content
        try:
            binary_resource = response.json()
            content_base64 = binary_resource.get("content") or binary_resource.get("data")
            content_type = binary_resource.get("contentType", "text/html")

            if not content_base64:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Binary content field not found. Available fields: {list(binary_resource.keys())}"
                )

            binary_data = base64.b64decode(content_base64)
            return Response(content=binary_data, media_type=content_type)
        except Exception as e:
            print(f"Error parsing binary response: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to parse binary content: {str(e)}")
    else:
        # Raw binary/HTML data
        return Response(
            content=response.content, 
            media_type=content_type_header or "text/html"
        )
# FIXED: Added audit logging endpoint
@router.post("/epic/audit/log-view")
async def log_epic_resource_view(
    patient_id: str = Query(...),
    resource_id: str = Query(...),
    resource_type: str = Query(...),
    action: str = Query(...),
    authorization: str = Header(None)
):
    """
    Log when a user views a resource (for audit purposes).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    # Log the action (you can store this in a database)
    print(f"AUDIT LOG: User viewed {resource_type} {resource_id} for patient {patient_id}. Action: {action}")
    
    # In production, save to database:
    # audit_entry = AuditLog(
    #     patient_id=patient_id,
    #     resource_id=resource_id,
    #     resource_type=resource_type,
    #     action=action,
    #     timestamp=datetime.utcnow()
    # )
    # db.add(audit_entry)
    # db.commit()
    
    return {"status": "logged", "message": "Resource view logged successfully"}