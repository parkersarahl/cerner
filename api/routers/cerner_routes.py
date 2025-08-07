from fastapi import APIRouter, HTTPException, Query, Depends, Request
from fastapi.responses import StreamingResponse
from utils.permissions import get_current_user, require_role  # ✅ Import the auth dependency
from utils.audit_logger import log_audit_event
from database import get_db
from sqlalchemy.orm import Session
import httpx
import io

router = APIRouter()

FHIR_BASE_URL = "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d"
HEADERS = {"Accept": "application/fhir+json"}
TIMEOUT = httpx.Timeout(30.0, connect=10.0)

VALID_ACCEPTS = {
    "application/pdf", "image/jpeg", "application/dicom",
    "application/fhir+xml", "application/fhir+json",
    "text/plain", "*/*"
}

# ---------- Patient Search ----------
@router.get("/cerner/patient")

async def search_patients(
    request: Request,
    name: str = Query(..., description="Name of the patient to search"),
    user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db),
    
):
    url = f"{FHIR_BASE_URL}/Patient?name={name}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=HEADERS)

    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Error from FHIR API: {response.text}")

    bundle = response.json()
    patients = []

    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        name_data = resource.get("name", [])
        full_name = ""
        if name_data:
            given = " ".join(name_data[0].get("given", []))
            family = name_data[0].get("family", "")
            full_name = f"{given} {family}".strip()

        patients.append({
            "id": resource.get("id"),
            "name": full_name,
            "gender": resource.get("gender"),
            "birthDate": resource.get("birthDate")
        })
    log_audit_event(
        db=db,
        user_id=user["sub"],
        action="searched patient",
        resource_type="Patient",
        resource_id=None,
        patient_id=None,
        ip_address=request.client.host
    )
    return {"patients": patients}


# ---------- Get Patient by ID ----------
@router.get("/cerner/patient/{patient_id}")
async def get_patient_by_id(
    request: Request,
    patient_id: str,
    user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db)
):
    url = f"{FHIR_BASE_URL}/Patient/{patient_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=HEADERS)

    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Error from FHIR API: {response.text}")

    log_audit_event(
        db=db,
        user_id=user["sub"],
        action="viewed patient",
        resource_type="Patient",
        resource_id=patient_id,
        patient_id=patient_id,
        ip_address=request.client.host
    )

    return response.json()

# ---------- Diagnostic Report Fetchers ----------
async def fetch_reports_by_category(patient: str, category_code: str):
    url = f"{FHIR_BASE_URL}/DiagnosticReport"
    params = {"patient": patient, "category": category_code}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(url, params=params, headers=HEADERS)

    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Error from FHIR API: {response.text}")

    return response.json()


@router.get("/cerner/diagnostic-reports/radiology")
async def get_radiology_reports(
    patient: str,
    user: dict = Depends(require_role(["provider", "admin"])),
):
    bundle = await fetch_reports_by_category(patient, "http://terminology.hl7.org/CodeSystem/v2-0074|RAD")
    filtered = []

    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        for category in resource.get("category", []):
            for coding in category.get("coding", []):
                if coding.get("code") == "LP29684-5":
                    filtered.append(entry)
                    break

    return {"entry": filtered}


@router.get("/cerner/diagnostic-reports/labs")
async def get_lab_reports(
    patient: str,
    user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db)  # ✅ Protected
):
    return await fetch_reports_by_category(patient, "http://terminology.hl7.org/CodeSystem/v2-0074|LAB")


@router.get("/cerner/diagnostic-reports/clinical")
async def get_clinical_notes(
    patient: str,
    user: dict = Depends(require_role(["provider", "admin"])),
    db: Session = Depends(get_db)  # ✅ Protected
):
    bundle = await fetch_reports_by_category(patient, "http://loinc.org|LP29708-2")
    filtered = []

    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})

        if "presentedForm" in resource:
            resource["content"] = [{"attachment": form} for form in resource["presentedForm"]]

        for category in resource.get("category", []):
            for coding in category.get("coding", []):
                if coding.get("code") == "LP29708-2":
                    filtered.append(entry)
                    break
    return {"entry": filtered}


@router.post("/cerner/audit/log-view")
def log_diagnostic_report_view(
    request: Request,
    patient_id: str = Query(...),
    resource_id: str = Query(...),
    resource_type: str = Query(...),
    action: str = Query(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    try:
        ip_address = request.client.host

        log_audit_event(
            db=db,
            user_id=user["sub"],
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            patient_id=patient_id,
            ip_address=ip_address,
        )
    except Exception as e:
        print(f"Audit log failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to log audit event")

    return {"message": "Audit event logged"}
# ---------- Binary Proxy ----------
@router.get("/cerner/binary/{binary_id}")
async def proxy_binary(
    binary_id: str,
    accept: str = Query("application/pdf"),
    user: dict = Depends(require_role(["provider", "admin"]))  # ✅ Protected
):
    if accept not in VALID_ACCEPTS:
        accept = "application/pdf"

    url = f"{FHIR_BASE_URL}/Binary/{binary_id}"
    headers = {"Accept": accept}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        content = response.content

    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Error fetching binary: {content.decode(errors='ignore')}")

    return StreamingResponse(io.BytesIO(content), media_type=response.headers.get("content-type"))
