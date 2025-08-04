from fastapi import APIRouter, Path, Request, HTTPException, Query, Header, Depends
from fastapi.responses import RedirectResponse, StreamingResponse
import io
import urllib.parse
import secrets
from utils.permissions import get_current_user, require_role  # ⬅️ Import protection
from utils.audit_logger import log_audit_event
from database import get_db
from sqlalchemy.orm import Session  
from services.ehr.epic import EpicEHR
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
    return RedirectResponse(auth_url)

# Public
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

        redirect_url = f"https://fhir-five.vercel.app/search/epic?token={access_token}"
        return RedirectResponse(redirect_url)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")

# ✅ Protected
@router.get("/epic/patient")
async def search_patient_epic(
    name: str = Query(...),
    user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db)
):
    filtered = [
        patient for patient in mock_patients["patients"]
        if name.lower() in " ".join(
            patient["name"][0].get("given", []) +
            [patient["name"][0].get("family", "")]
        ).lower()
    ]
    log_audit_event(
        db=db,
        user_id=user["sub"],  # or user.id depending on your user model
        action="searched patients",
        resource_type="Patient",
        resource_id=None  # No specific patient ID since this is a search  
    )
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(filtered),
        "entry": [
            {"fullUrl": f"urn:uuid:{patient['id']}", "resource": patient}
            for patient in filtered
        ]
    }

# ✅ Protected
@router.get("/epic/patient/{patient_id}")
async def get_mock_patient_by_id(
    patient_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    log_audit_event(
        db=db,
        user_id=user["sub"],  # or user.id depending on your user model
        action="searched_patient",
        resource_type="Patient",
        resource_id=patient_id
    )
    for patient in mock_patients["patients"]:
        if patient["id"] == patient_id:
            return patient
    raise HTTPException(status_code=404, detail="Patient not found")

# ✅ Protected
@router.get("/epic/documentReferences")
def get_mock_documents(
    patientId: str,
    type: str = Query(...),
    user: dict = Depends(require_role(["provider", "admin"]))
):
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

# ✅ Protected
@router.get("/epic/binary/{binary_id}")
def get_epic_binary(
    binary_id: str,
    user: dict = Depends(require_role(["provider", "admin"]))
):
    if binary_id not in mock_binary_files:
        raise HTTPException(status_code=404, detail="Binary resource not found")

    file_data = mock_binary_files[binary_id]

    return StreamingResponse(
        io.BytesIO(file_data["content"]),
        media_type=file_data.get("content_type", "application/pdf"),
        headers={"Content-Disposition": f"inline; filename={binary_id}.pdf"},
    )

# Public
@router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}
