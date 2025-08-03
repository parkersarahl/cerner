# utils/audit_logger.py
from models.audit_log import AuditLog
from sqlalchemy.orm import Session
from datetime import datetime

def log_audit_event(db: Session, user_id: str, action: str, resource_type: str, resource_id: str = None):
    event = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id
    )
    db.add(event)
    db.commit()
    db.refresh(event)

