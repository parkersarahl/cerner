# services/ehr/epic.py
from .base import EHRVendor
from datetime import datetime, timezone, timedelta
import jwt, os, uuid, requests, json, httpx
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.x509 import load_pem_x509_certificate

from config import (
    EPIC_CLIENT_ID,
    EPIC_REDIRECT_URI,
    EPIC_AUTH_URL,
    EPIC_SCOPES,
    EPIC_TOKEN_URL,
    EPIC_CLIENT_SECRET,
)

EPIC_FHIR_URL = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
CLIENT_ID = EPIC_CLIENT_ID 
EPIC_TOKEN_URL = EPIC_TOKEN_URL
EPIC_AUTH_URL = EPIC_AUTH_URL

class EpicEHR(EHRVendor):
    @staticmethod
    def exchange_code_for_token(code: str) -> dict:
        print("🔥 exchange_code_for_token() was called!")  # Add this as the first line
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": EPIC_REDIRECT_URI,
            "client_id": EPIC_CLIENT_ID,
            "client_secret": EPIC_CLIENT_SECRET,
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        }

        # Print data being sent (for debugging)
        print("Sending token exchange request with:", data)
        print("Using token URL:", EPIC_TOKEN_URL)
        print("Using redirect URI:", EPIC_REDIRECT_URI)
        print("Using client ID:", EPIC_CLIENT_ID)
        print("Using client secret:", (EPIC_CLIENT_SECRET[:4] + "...") if EPIC_CLIENT_SECRET else "None")

        response = requests.post(EPIC_TOKEN_URL, data=data, headers=headers)

        # Print response status and body for debugging
        print("Token exchange response status:", response.status_code)
        print("Token exchange response body:", response.text)

        if response.status_code != 200:
            raise Exception(f"Token exchange failed: {response.status_code}, {response.text}")

        return response.json()  # access_token, id_token, etc.
