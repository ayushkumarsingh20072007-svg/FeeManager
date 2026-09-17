from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.users import User
from app.models.enums import UserRole
from app.rules.risk_engine import calculate_default_risk, get_cohort_default_risk

ALLOWED_STAFF_ROLES = {
    UserRole.ACCOUNTS_OFFICER,
    UserRole.FINANCE_APPROVER,
    UserRole.MANAGEMENT,
    UserRole.ADMIN,
    UserRole.SYSTEM_ADMIN,
}

def get_default_risk_score(
    db: Session,
    current_user: User,
    student_id: str
) -> Dict[str, Any]:
    """
    Computes single student's default risk score + factor breakdown.
    Restricted to staff roles (ACCOUNTS_OFFICER, FINANCE_APPROVER, MANAGEMENT, ADMIN).
    """
    if current_user.role not in ALLOWED_STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{current_user.role}' is not authorized to access default-risk scoring."
        )

    try:
        return calculate_default_risk(student_or_id=student_id, db=db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

def get_high_risk_students(
    db: Session,
    current_user: User,
    program_id: Optional[str] = None,
    min_score: int = 61
) -> Dict[str, Any]:
    """
    Returns cohort-level list of students at default risk >= min_score, sorted descending by score.
    Restricted to staff roles.
    """
    if current_user.role not in ALLOWED_STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{current_user.role}' is not authorized to access default-risk cohorts."
        )

    students_at_risk = get_cohort_default_risk(
        db=db,
        program_code=program_id,
        min_score=min_score
    )

    return {
        "count": len(students_at_risk),
        "min_score": min_score,
        "program_filter": program_id,
        "students": students_at_risk
    }
