from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.users import User, Student
from app.models.enums import UserRole
from app.schemas.risk import RiskScoreResponse, HighRiskStudentsResponse
from app.rules.risk_engine import calculate_default_risk, get_cohort_default_risk

router = APIRouter(prefix="/risk", tags=["Default Risk Scoring"])

ALLOWED_STAFF_ROLES = {
    UserRole.ACCOUNTS_OFFICER,
    UserRole.FINANCE_APPROVER,
    UserRole.MANAGEMENT,
    UserRole.ADMIN,
    UserRole.SYSTEM_ADMIN,
}

def check_staff_permission(user: User):
    if user.role not in ALLOWED_STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role}' is not authorized to access default-risk predictive data."
        )

@router.get("/student/{student_id}", response_model=RiskScoreResponse)
def get_student_risk_score(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns rule-based default risk score and factor breakdown for a specific student.
    Restricted to Staff / Finance roles.
    """
    check_staff_permission(current_user)
    try:
        res = calculate_default_risk(student_or_id=student_id, db=db)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/high-risk-students", response_model=HighRiskStudentsResponse)
def get_high_risk_students_list(
    program_code: Optional[str] = Query(None, description="Optional program code filter (e.g. BTECH-CSE)"),
    min_score: int = Query(61, ge=0, le=100, description="Minimum risk score threshold (default: 61)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of students with default risk score >= min_score, sorted descending by score.
    Restricted to Staff / Finance roles.
    """
    check_staff_permission(current_user)
    students_at_risk = get_cohort_default_risk(db=db, program_code=program_code, min_score=min_score)
    return {
        "count": len(students_at_risk),
        "min_score": min_score,
        "program_filter": program_code,
        "students": students_at_risk
    }

@router.get("/dashboard-summary")
def get_risk_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns high-level distribution of risk tiers (LOW, MEDIUM, HIGH) across all students,
    along with the top 5 highest risk students for the dashboard widget.
    """
    check_staff_permission(current_user)
    students = db.query(Student).all()
    all_scores = [calculate_default_risk(student_or_id=s, db=db) for s in students]

    distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for item in all_scores:
        distribution[item["risk_tier"]] += 1

    # Sort descending by risk score
    all_scores.sort(key=lambda x: x["risk_score"], reverse=True)
    top_high_risk = all_scores[:5]

    # Format top 5 with primary reason (top contributing factor)
    top_5_formatted = []
    for s in top_high_risk:
        top_factor = max(s["contributing_factors"], key=lambda f: f["points"]) if s["contributing_factors"] else None
        primary_reason = f"{top_factor['factor']}: {top_factor['explanation']}" if top_factor else "High default risk"
        top_5_formatted.append({
            "student_id": s["student_id"],
            "roll_no": s["roll_no"],
            "student_name": s["student_name"],
            "program_code": s["program_code"],
            "risk_score": s["risk_score"],
            "risk_tier": s["risk_tier"],
            "primary_reason": primary_reason,
            "contributing_factors": s["contributing_factors"]
        })

    return {
        "total_students": len(students),
        "distribution": distribution,
        "top_high_risk": top_5_formatted
    }
