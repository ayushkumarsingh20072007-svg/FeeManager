import json
from typing import Optional, Any, List
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.enums import AuditAction, UserRole
from app.repositories.audit_repository import AuditRepository

class AuditService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = AuditRepository(db)

    def log(
        self,
        action: AuditAction,
        resource_type: str = "SYSTEM",
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        role: Optional[UserRole] = None,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        approval_id: Optional[str] = None,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Optional[Any] = None,
        **kwargs
    ) -> AuditLog:
        """Creates an append-only audit record on the instance."""
        res_type = entity_type or resource_type
        res_id = entity_id or resource_id
        new_val = details or new_value

        old_val_str = json.dumps(old_value) if isinstance(old_value, (dict, list)) else (str(old_value) if old_value is not None else None)
        new_val_str = json.dumps(new_val) if isinstance(new_val, (dict, list)) else (str(new_val) if new_val is not None else None)

        audit_record = AuditLog(
            user_id=user_id,
            role=role,
            action=action,
            resource_type=res_type,
            resource_id=str(res_id) if res_id else None,
            old_value=old_val_str,
            new_value=new_val_str,
            approval_id=approval_id,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id
        )
        return self.repository.log_event(audit_record)

    @classmethod
    def log_event(
        cls,
        db: Session,
        action: AuditAction,
        resource_type: str = "SYSTEM",
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        role: Optional[UserRole] = None,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        approval_id: Optional[str] = None,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Optional[Any] = None,
        **kwargs
    ) -> AuditLog:
        return cls(db).log(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            role=role,
            old_value=old_value,
            new_value=new_value,
            approval_id=approval_id,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            **kwargs
        )

    def list_logs(
        self,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        action: Optional[AuditAction] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AuditLog]:
        return self.repository.query_logs(
            user_id=user_id,
            resource_type=resource_type,
            action=action,
            limit=limit,
            offset=offset
        )
