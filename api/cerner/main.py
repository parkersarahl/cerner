from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
import httpx

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
    return bundle

@app.get("/api/cerner/patient/{patient_id}")
async def get_patient_by_id(patient_id: str):
    url = f"{FHIR_BASE_URL}/Patient/{patient_id}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Accept": "application/fhir+json"})
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Error from FHIR API: {resp.text}")
    return resp.json()

from fastapi.responses import StreamingResponse

@app.get("/api/cerner/binary/{binary_id}")
async def proxy_binary(binary_id: str):
    url = f"{FHIR_BASE_URL}/Binary/{binary_id}"
    headers = {"Accept": "*/*"}  #any text or binary content
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, f"Error fetching binary: {resp.text}")
        return StreamingResponse(resp.aiter_raw(), media_type=resp.headers.get("content-type"))



    
