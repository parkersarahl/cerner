import os
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env


SECRET_KEY = os.getenv("SECRET_KEY")  # Used for JWT signing

CERNER_CLIENT_ID = os.getenv("CERNER_CLIENT_ID")
CERNER_REDIRECT_URI = os.getenv("CERNER_REDIRECT_URI")
CERNER_AUTH_URL = os.getenv("CERNER_AUTH_URL")
CERNER_TOKEN_URL = os.getenv("CERNER_TOKEN_URL")
CERNER_FHIR_BASE_URL_PROVIDER = os.getenv("CERNER_FHIR_BASE_URL")
CERNER_FHIR_BASE_URL_PATIENT = os.getenv("CERNER_FHIR_BASE_URL_PATIENT")
CERNER_SCOPES = "openid fhirUser profile user/*.read offline_access"
CERNER_CLIENT_SECRET = os.getenv("CERNER_SECRET")
CERNER_TENANT_ID = os.getenv("CERNER_TENANT_ID")

DATABASE_URL = os.getenv("DATABASE_URL")
