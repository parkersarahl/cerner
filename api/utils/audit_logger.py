# utils/audit_logger.py
from models.audit_log import AuditLog
from sqlalchemy.orm import Session

def log_audit_event(
    db: Session,
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str = None,
    patient_id: str = None,
    ip_address: str = None,
):
    event = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        patient_id=patient_id,
        ip_address=ip_address,
    )
    db.add(event)
    db.commit()
    db.refresh(event)


