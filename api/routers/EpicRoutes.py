from fastapi import APIRouter, Path, Request, HTTPException, Query, Header
from fastapi.responses import RedirectResponse, StreamingResponse
import httpx
import urllib.parse
import secrets
#from sqlalchemy.orm import Session  
from routers.epicBase import EpicEHR



EPIC_CLIENT_ID = "b3d4de6f-fff6-45cb-ad65-eff1c502c2c1"
EPIC_REDIRECT_URI = "http://localhost:8000/epic/callback"
EPIC_SCOPES = "openid fhirUser profile user/*.read offline_access"
EPIC_AUTH_URL="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize"
EPIC_TOKEN_URL="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
EPIC_FHIR_BASE_URL="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"

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
    print("Auth URL:", auth_url )  # Debugging line
    return RedirectResponse(auth_url)

# Public
@router.get("/epic/callback")
async def epic_callback(request: Request):
    code = request.query_params.get("code")
    state = request.query_params.get("state")  # grab state if you sent it originally

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

    redirect_url = f"http://localhost:3000/search/epic?token={access_token}"
    if state:
        redirect_url += f"&state={state}"

    return RedirectResponse(redirect_url)


@router.get("/epic/patient")
async def search_patients(
    patient_id: str = Query(None, description="FHIR Patient ID (use _id for exact match)"),
    name: str = Query(None, description="Patient name (optional)"),
    authorization: str = Header(None)
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

    # Construct search parameters
    query_params = {}
    if patient_id:
        query_params["_id"] = patient_id   # Exact patient match
    if name:
        query_params["name"] = name        # Partial match allowed

    # Make the FHIR API request
    async with httpx.AsyncClient() as client:
        response = await client.get(base_url, headers=headers, params=query_params)

    # Handle errors
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Epic FHIR patient search failed: {response.text}",
        )

    return response.json()
