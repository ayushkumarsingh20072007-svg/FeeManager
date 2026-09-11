from fastapi import APIRouter, Depends
from app.api.deps import require_role
from app.models.enums import UserRole
from app.models.users import User

router = APIRouter(prefix="/rbac-test", tags=["RBAC Test Suite"])

@router.get("/student-only")
def student_only_endpoint(current_user: User = Depends(require_role(UserRole.STUDENT, UserRole.PARENT))):
    """Endpoint accessible only by Students and Parents."""
    return {
        "message": "Access granted: Student/Parent zone",
        "user": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    }

@router.get("/finance-only")
def finance_only_endpoint(
    current_user: User = Depends(
        require_role(UserRole.ACCOUNTS_OFFICER, UserRole.FINANCE_APPROVER, UserRole.MANAGEMENT, UserRole.ADMIN)
    )
):
    """Endpoint accessible only by Financial Operations personnel."""
    return {
        "message": "Access granted: Financial Operations zone",
        "user": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    }

@router.get("/approver-only")
def approver_only_endpoint(
    current_user: User = Depends(require_role(UserRole.FINANCE_APPROVER, UserRole.ADMIN))
):
    """Endpoint accessible only by designated Finance Approvers."""
    return {
        "message": "Access granted: Financial Sign-off & Approval zone",
        "user": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    }
