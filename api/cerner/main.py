from fastapi import FastAPI, HTTPException, Query
import httpx
from fastapi.responses import StreamingResponse
import io

app = FastAPI()

FHIR_BASE_URL = "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d"


@app.get("/api/patients")
async def search_patients(name: str = Query(..., description="Name of the patient to search")):
    url = f"{FHIR_BASE_URL}/Patient?name={name}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers={"Accept": "application/fhir+json"})

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"Error from FHIR API: {response.text}")

    fhir_bundle = response.json()
    patients = []

    for entry in fhir_bundle.get("entry", []):
        resource = entry.get("resource", {})
        name_data = resource.get("name", [])
        full_name = ""

        if name_data:
            given = " ".join(name_data[0].get("given", []))
            family = name_data[0].get("family", "")
            full_name = f"{given} {family}".strip()

        patient_info = {
            "id": resource.get("id"),
            "name": full_name,
            "gender": resource.get("gender"),
            "birthDate": resource.get("birthDate")
        }
        patients.append(patient_info)

    return {"patients": patients}

@app.get("/api/cerner/diagnostic-reports/radiology")
async def get_diagnostic_reports(patient: str):
    url = f"{FHIR_BASE_URL}/DiagnosticReport?patient={patient}&category=http://terminology.hl7.org/CodeSystem/v2-0074|RAD"
    params = {"patient": patient}
    headers = {"Accept": "application/fhir+json"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)

    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Error from FHIR API: {response.text}")

    bundle = response.json()

    filtered_entries = []
    for entry in bundle.get("entry", []):
        category_list = entry["resource"].get("category", [])
        for cat in category_list:
            for coding in cat.get("coding", []):
                if coding.get("code") == "LP29684-5":  # Radiology
                    filtered_entries.append(entry)
                    break

    return {"entry": filtered_entries}


@app.get("/api/cerner/patient/{patient_id}")
async def get_patient_by_id(patient_id: str):
    url = f"{FHIR_BASE_URL}/Patient/{patient_id}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Accept": "application/fhir+json"})
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Error from FHIR API: {resp.text}")
    return resp.json()

@app.get("/api/cerner/diagnostic-reports/labs")
async def get_lab_reports(patient: str):
    url = f"{FHIR_BASE_URL}/DiagnosticReport"
    params = {
        "patient": patient,
        "category": "http://terminology.hl7.org/CodeSystem/v2-0074|LAB"
    }
    headers = {"Accept": "application/fhir+json"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)

    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Error from FHIR API: {response.text}")

    return response.json()

VALID_ACCEPTS = {
    "application/pdf",
    "image/jpeg",
    "application/dicom",
    "application/fhir+xml",
    "application/fhir+json",
    "*/*",
}

@app.get("/api/cerner/binary/{binary_id}")
async def proxy_binary(binary_id: str, accept: str = Query("application/pdf")):
    if accept not in VALID_ACCEPTS:
        accept = "application/pdf"

    url = f"{FHIR_BASE_URL}/Binary/{binary_id}"
    headers = {"Accept": accept}

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        content = resp.content  # Read content ONCE

        if resp.status_code != 200:
            raise HTTPException(resp.status_code, f"Error fetching binary: {content.decode(errors='ignore')}")

        return StreamingResponse(io.BytesIO(content), media_type=resp.headers.get("content-type"))


