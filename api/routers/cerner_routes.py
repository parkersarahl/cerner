from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
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
async def search_patients(name: str = Query(..., description="Name of the patient to search")):
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

    return {"patients": patients}


# ---------- Get Patient by ID ----------
@router.get("/cerner/patient/{patient_id}")
async def get_patient_by_id(patient_id: str):
    url = f"{FHIR_BASE_URL}/Patient/{patient_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=HEADERS)

    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Error from FHIR API: {response.text}")

    return response.json()


# ---------- Diagnostic Report Fetchers ----------
async def fetch_reports_by_category(patient: str, category_code: str):
    url = f"{FHIR_BASE_URL}/DiagnosticReport"
    params = {
        "patient": patient,
        "category": category_code
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(url, params=params, headers=HEADERS)

    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Error from FHIR API: {response.text}")

    return response.json()


@router.get("/cerner/diagnostic-reports/radiology")
async def get_radiology_reports(patient: str):
    bundle = await fetch_reports_by_category(patient, "http://terminology.hl7.org/CodeSystem/v2-0074|RAD")
    filtered = []

    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        for category in resource.get("category", []):
            for coding in category.get("coding", []):
                if coding.get("code") == "LP29684-5":  # Radiology
                    filtered.append(entry)
                    break

    return {"entry": filtered}


@router.get("/cerner/diagnostic-reports/labs")
async def get_lab_reports(patient: str):
    return await fetch_reports_by_category(patient, "http://terminology.hl7.org/CodeSystem/v2-0074|LAB")


@router.get("/cerner/diagnostic-reports/clinical")
async def get_clinical_notes(patient: str):
    bundle = await fetch_reports_by_category(patient, "http://loinc.org|LP29708-2")
    filtered = []

    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})

        # Normalize presentedForm -> content for frontend consistency
        if "presentedForm" in resource:
            resource["content"] = [{"attachment": form} for form in resource["presentedForm"]]

        for category in resource.get("category", []):
            for coding in category.get("coding", []):
                if coding.get("code") == "LP29708-2":  # Clinical Notes
                    filtered.append(entry)
                    break

    return {"entry": filtered}


# ---------- Binary Proxy ----------
@router.get("/cerner/binary/{binary_id}")
async def proxy_binary(binary_id: str, accept: str = Query("application/pdf")):
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
