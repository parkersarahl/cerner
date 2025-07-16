# routers/auth.py

from fastapi import APIRouter, Path, Request, HTTPException, Query, Header
from fastapi.responses import RedirectResponse, StreamingResponse
import io
import urllib.parse
from services.ehr.epic import EpicEHR
import secrets
from mock_epic_data import mock_patients, mock_document_reference, mock_binary_files


from config import (
    EPIC_CLIENT_ID,
    EPIC_REDIRECT_URI,
    EPIC_AUTH_URL,
    EPIC_SCOPES,
)

from utils.epic_helpers import (
    get_lab_documents,
    get_radiology_documents,
    get_clinical_notes,
)

router = APIRouter()

state = secrets.token_urlsafe(16)  # Generate a secure random state

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
    print("🔍 Epic Auth URL:", auth_url)  # <-- Debug print here

    return RedirectResponse(auth_url)

@router.get("/epic/callback")
async def epic_callback(request: Request):
    print("Callback route hit with query params:", dict(request.query_params))
    
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code from Epic")

    try:
        print("Calling token exchange with code:", code) #This line is for debugging
        token_response = EpicEHR.exchange_code_for_token(code)
        print("Token response received:", token_response)  # << And this
        access_token = token_response.get("access_token")

        if not access_token:
            raise HTTPException(status_code=500, detail="No access_token returned")

        # For sandbox: redirect with token to frontend
        redirect_url = f"http://localhost:3000/search/epic?token={access_token}"
        return RedirectResponse(redirect_url)

    except Exception as e:
        print("Exception during token exchange:", str(e))
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")


@router.get("/epic/patient")
async def search_patient_epic(
    name: str = Query(...),
    authorization: str = Header(..., alias="Authorization")
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=400, detail="Missing Bearer token")

    filtered = [
    patient for patient in mock_patients["patients"]
    if name.lower() in " ".join(
        patient["name"][0].get("given", []) +
        [patient["name"][0].get("family", "")]
    ).lower()
]

    return {
    "resourceType": "Bundle",
    "type": "searchset",
    "total": len(filtered),
    "entry": [
        { "fullUrl": f"urn:uuid:{patient['id']}", "resource": patient }
        for patient in filtered
    ]
}

@router.get("/epic/patient/{patient_id}")
async def get_mock_patient_by_id(patient_id: str,):
    for patient in mock_patients["patients"]:
        if patient["id"] == patient_id:
            return patient
    raise HTTPException(status_code=404, detail="Patient not found")


@router.get("/epic/documentReferences")
def get_mock_documents(patientId: str, type: str = Query(...)):
    if type == "lab":
        documents = get_lab_documents(patientId)
    elif type == "radiology":
        documents = get_radiology_documents(patientId)
    elif type == "clinical":
        documents = get_clinical_notes(patientId)
    else:
        documents = []

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "entry": [{"resource": doc} for doc in documents],
        "total": len(documents),
    }

@router.get("/epic/binary/{binary_id}")
def get_epic_binary(binary_id: str):
    if binary_id not in mock_binary_files:
        raise HTTPException(status_code=404, detail="Binary resource not found")

    file_data = mock_binary_files[binary_id]

    return StreamingResponse(
        io.BytesIO(file_data["content"]),
        media_type=file_data.get("content_type", "application/pdf"),
        headers={"Content-Disposition": f"inline; filename={binary_id}.pdf"},
    )

@router.get("/logout")
async def logout(request: Request):
    """
    Logs out the user by clearing the session.
    """
    request.session.clear()
    return {"message": "Logged out successfully"}

