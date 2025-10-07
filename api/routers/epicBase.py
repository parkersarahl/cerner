# services/ehr/epic.py
from routers.base import EHRVendor
import httpx


EPIC_CLIENT_ID = "b3d4de6f-fff6-45cb-ad65-eff1c502c2c1"
EPIC_REDIRECT_URI = "http://localhost:8000/epic/callback"
EPIC_SCOPES = "openid fhirUser profile user/*.read offline_access"
EPIC_AUTH_URL="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize"
EPIC_TOKEN_URL="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
EPIC_FHIR_BASE_URL="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"

class EpicEHR(EHRVendor):
    @staticmethod
    async def exchange_code_for_token(code: str):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": "http://localhost:8000/epic/callback",
                        "client_id": "b3d4de6f-fff6-45cb-ad65-eff1c502c2c1",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=10
                )
            except httpx.RequestError as e:
                raise Exception(f"HTTP request failed: {e}") from e

            # Debug output
            print("Token endpoint status:", response.status_code)
            print("Token endpoint text:", response.text)

            if response.status_code != 200:
                raise Exception(f"Token exchange failed: {response.status_code}, {response.text}")

            try:
                token_data = response.json()
            except Exception as e:
                raise Exception(f"Failed to parse token JSON: {e}, response text: {response.text}")

            access_token = token_data.get("access_token")
            if not access_token:
                raise Exception(f"No access_token returned: {token_data}")

            return token_data