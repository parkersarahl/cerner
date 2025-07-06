from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
import base64

def generate_base64_pdf(text: str = "Hello PDF") -> str:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica", 12)
    c.drawString(100, 750, text)
    c.showPage()
    c.save()
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")

# Mock Epic FHIR Bundle with 10 patients
mock_patients = {
    "patients": [
    {
      "resourceType": "Patient",
      "id": "mock-01",
      "name": [{"use": "official", "family": "Doe", "given": ["Judy"]}],
      "gender": "female",
      "birthDate": "1985-04-12"
    },
    {
      "resourceType": "Patient",
      "id": "mock-02",
      "name": [{"use": "official", "family": "Smith", "given": ["John"]}],
      "gender": "male",
      "birthDate": "1979-09-20"
    },
    {
      "resourceType": "Patient",
      "id": "mock-03",
      "name": [{"use": "official", "family": "Nguyen", "given": ["Linh"]}],
      "gender": "female",
      "birthDate": "1990-07-01"
    },
    {
      "resourceType": "Patient",
      "id": "mock-04",
      "name": [{"use": "official", "family": "Chen", "given": ["Wei"]}],
      "gender": "male",
      "birthDate": "1962-01-15"
    },
    {
      "resourceType": "Patient",
      "id": "mock-05",
      "name": [{"use": "official", "family": "Garcia", "given": ["Maria"]}],
      "gender": "female",
      "birthDate": "2000-11-30"
    },
    {
      "resourceType": "Patient",
      "id": "mock-06",
      "name": [{"use": "official", "family": "O'Neil", "given": ["Connor"]}],
      "gender": "male",
      "birthDate": "1995-05-20"
    },
    {
      "resourceType": "Patient",
      "id": "mock-07",
      "name": [{"use": "official", "family": "Patel", "given": ["Aisha"]}],
      "gender": "female",
      "birthDate": "1988-09-10"
    },
    {
      "resourceType": "Patient",
      "id": "mock-08",
      "name": [{"use": "official", "family": "Brown", "given": ["Derek"]}],
      "gender": "male",
      "birthDate": "1970-02-18"
    },
    {
      "resourceType": "Patient",
      "id": "mock-09",
      "name": [{"use": "official", "family": "Khan", "given": ["Zara"]}],
      "gender": "female",
      "birthDate": "2004-08-25"
    },
    {
      "resourceType": "Patient",
      "id": "mock-10",
      "name": [{"use": "official", "family": "Williams", "given": ["James"]}],
      "gender": "male",
      "birthDate": "1982-03-05"
    }
  ]
}

mock_document_reference = {
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "DocumentReference",
        "id": "note-mock-01",
        "status": "current",
        "type": {
          "coding": [{ "system": "http://loinc.org", "code": "34109-9", "display": "Outpatient Note" }]
        },
        "subject": { "reference": "Patient/mock-01" },
        "date": "2023-12-01T10:00:00Z",
        "description": "Annual wellness exam note.",
        "content": [{
          "attachment": {
            "contentType": "application/pdf",
            "url": "http://localhost:8000/api/epic/binary/note-mock-01"
          }
        }]
      }
    },
    {
      "resource": {
        "resourceType": "DocumentReference",
        "id": "lab-mock-01",
        "status": "current",
        "type": {
          "coding": [{ "system": "http://loinc.org", "code": "24323-8", "display": "Lab Report" }]
        },
        "subject": { "reference": "Patient/mock-01" },
        "date": "2024-03-15T09:00:00Z",
        "description": "CBC lab report.",
        "content": [{
          "attachment": {
            "contentType": "application/pdf",
            "url": "http://localhost:8000/api/epic/binary/lab-mock-01"
          }
        }]
      }
    },
    {
      "resource": {
        "resourceType": "DocumentReference",
        "id": "rad-mock-01",
        "status": "current",
        "type": {
          "coding": [{ "system": "http://loinc.org", "code": "18748-4", "display": "Radiology Report" }]
        },
        "subject": { "reference": "Patient/mock-01" },
        "date": "2024-06-10T14:30:00Z",
        "description": "Chest X-ray report.",
        "content": [{
          "attachment": {
            "contentType": "application/pdf",
            "url": "http://localhost:8000/api/epic/binary/rad-mock-01"
          }
        }]
      }
    }
  ]
}
mock_binary_files = {
    "lab-mock-01": {
        "content": base64.b64decode(generate_base64_pdf("Lab Report: CBC normal")),
        "content_type": "application/pdf"
    },
    "rad-mock-01": {
        "content": base64.b64decode(generate_base64_pdf("Radiology Report: Chest X-ray")),
        "content_type": "application/pdf"
    },
    "note-mock-01": {
        "content": base64.b64decode(generate_base64_pdf("Clinical Note: Annual wellness visit")),
        "content_type": "application/pdf"
    }
}

