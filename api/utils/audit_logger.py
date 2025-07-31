# utils/audit_logger.py

from models.audit_log import AuditLog

def log_audit_event(db, user_id: str, patient_id: str, action: str, ip_address: str = None):
    """Insert an audit log record into the database."""
    log_entry = AuditLog(
        user_id=user_id,
        patient_id=patient_id,
        action=action,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
