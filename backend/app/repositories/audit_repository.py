from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.enums import AuditAction
from app.repositories.base_repository import BaseRepository

class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, db: Session):
        super().__init__(AuditLog, db)

    def log_event(self, audit_log: AuditLog) -> AuditLog:
        """Appends an immutable audit log record to the database."""
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        return audit_log

    def query_logs(
        self,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        action: Optional[AuditAction] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AuditLog]:
        q = self.db.query(AuditLog)
        if user_id:
            q = q.filter(AuditLog.user_id == user_id)
        if resource_type:
            q = q.filter(AuditLog.resource_type == resource_type)
        if action:
            q = q.filter(AuditLog.action == action)
        return q.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
