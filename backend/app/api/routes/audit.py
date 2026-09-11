from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import require_role, get_audit_service
from app.models.enums import UserRole, AuditAction
from app.models.users import User
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    action: Optional[AuditAction] = Query(None, description="Filter by action"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SYSTEM_ADMIN)),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Retrieves paginated audit logs. Restricted to ADMIN, MANAGEMENT, and SYSTEM_ADMIN."""
    logs = audit_service.list_logs(
        user_id=user_id,
        resource_type=resource_type,
        action=action,
        limit=limit,
        offset=offset
    )
    return logs
