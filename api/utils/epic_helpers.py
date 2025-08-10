# utils/epic_helpers.py
from mock_epic_data import mock_document_reference

def get_documents_by_type(patient_id: str, doc_type_code: str):
    return [
        entry["resource"]
        for entry in mock_document_reference["entry"]
        if (
            entry.get("resource", {}).get("subject", {}).get("reference") == f"Patient/{patient_id}"
            and entry["resource"].get("type", {}).get("coding", [{}])[0].get("code") == doc_type_code
        )
    ]
# Lab Report
def get_lab_documents(patient_id: str):
    return get_documents_by_type(patient_id, "24323-8")  

# Radiology Report
def get_radiology_documents(patient_id: str):
    return get_documents_by_type(patient_id, "18748-4")  

# Clinical Note
def get_clinical_notes(patient_id: str):
    return get_documents_by_type(patient_id, "34109-9")  
