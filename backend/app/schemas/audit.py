from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import AuditAction, UserRole

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    role: Optional[UserRole] = None
    action: AuditAction
    resource_type: str
    resource_id: Optional[str] = None
    timestamp: datetime
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    approval_id: Optional[str] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None

class AuditLogFilter(BaseModel):
    user_id: Optional[str] = None
    resource_type: Optional[str] = None
    action: Optional[AuditAction] = None
    limit: int = 50
    offset: int = 0
