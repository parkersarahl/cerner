import os
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env

EPIC_CLIENT_ID = os.getenv("EPIC_CLIENT_ID")
EPIC_REDIRECT_URI = os.getenv("EPIC_REDIRECT_URI")
EPIC_AUTH_URL = os.getenv("EPIC_AUTH_URL")
EPIC_TOKEN_URL = os.getenv("EPIC_TOKEN_URL")
EPIC_FHIR_BASE_URL = os.getenv("EPIC_FHIR_BASE_URL")
EPIC_SCOPES= "openid fhirUser profile user/*.read offline_access"
EPIC_CLIENT_SECRET = os.getenv("EPIC_SECRET")
SECRET_KEY = os.getenv("SECRET_KEY")  # Used for JWT signing

EPIC_ISSUER = EPIC_CLIENT_ID  # usually the client ID
DATABASE_URL = os.getenv("DATABASE_URL")
