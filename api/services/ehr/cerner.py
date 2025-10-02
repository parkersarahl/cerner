# services/ehr/cerner.py
import requests
from services.ehr.base import EHRVendor
from config import (
    CERNER_CLIENT_ID,
    CERNER_REDIRECT_URI,
    CERNER_AUTH_URL,
    CERNER_SCOPES,
    CERNER_TOKEN_URL,
)

# Cerner FHIR base (example sandbox tenant)
CERNER_FHIR_URL = "https://fhir.sandboxcerner.com/r4"

class CernerEHR(EHRVendor):
    @staticmethod
    def exchange_code_for_token(code: str) -> dict:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": CERNER_REDIRECT_URI,
            "client_id": CERNER_CLIENT_ID,
            # Cerner’s sandbox apps often don’t require a client_secret for public apps
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        }

        response = requests.post(CERNER_TOKEN_URL, data=data, headers=headers)

        if response.status_code != 200:
            raise Exception(f"Token exchange failed: {response.status_code}, {response.text}")

        return response.json()  # contains access_token, id_token, etc.