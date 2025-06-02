from fastapi import FastAPI, HTTPException, Query
import httpx

app = FastAPI()

FHIR_BASE_URL = "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d"

@app.get("/api/practitioners")
async def get_practitioners(name: str = Query(..., description="Name of the practitioner to search")):
    url = f"{FHIR_BASE_URL}/Practitioner?name={name}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers={"Accept": "application/fhir+json"})

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"Error from FHIR API: {response.text}")

    return response.json()


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