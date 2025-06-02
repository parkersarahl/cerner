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
