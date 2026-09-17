import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.models.users import Student, User
from app.models.enums import UserRole
from app.rules.risk_engine import calculate_default_risk, get_cohort_default_risk
from app.ai.tools.risk_tools import get_default_risk_score, get_high_risk_students
from scripts.backtest_risk_engine import run_backtest

client = TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_fully_paid_student_low_risk(db: Session):
    """STU1001 (Aravind Kumar) is fully paid and must score 0 in LOW tier."""
    student = db.query(Student).filter(Student.roll_no == "STU1001").first()
    assert student is not None
    result = calculate_default_risk(student_or_id=student, db=db)
    assert result["risk_score"] == 0
    assert result["risk_tier"] == "LOW"
    assert len(result["contributing_factors"]) == 5

def test_overdue_student_high_risk(db: Session):
    """STU1002 (Priya Sharma) is overdue with scholarship and must score in HIGH tier (score >= 61)."""
    student = db.query(Student).filter(Student.roll_no == "STU1002").first()
    assert student is not None
    result = calculate_default_risk(student_or_id=student, db=db)
    assert result["risk_score"] >= 61
    assert result["risk_tier"] == "HIGH"

def test_contributing_factors_sum_integrity(db: Session):
    """Verifies contributing_factors points sum to total risk_score exactly for all 200 students."""
    students = db.query(Student).all()
    assert len(students) >= 200
    for s in students:
        result = calculate_default_risk(student_or_id=s, db=db)
        factor_sum = sum(f["points"] for f in result["contributing_factors"])
        assert factor_sum == result["risk_score"], f"Drift detected for student {s.roll_no}: {factor_sum} != {result['risk_score']}"

def test_rbac_student_role_forbidden(db: Session):
    """Student role cannot access risk score or cohort tools (403 Forbidden)."""
    student_user = db.query(User).filter(User.role == UserRole.STUDENT).first()
    assert student_user is not None

    with pytest.raises(Exception) as excinfo:
        get_default_risk_score(db=db, current_user=student_user, student_id="STU1001")
    assert "403" in str(excinfo.value) or "not authorized" in str(excinfo.value).lower()

    with pytest.raises(Exception) as excinfo:
        get_high_risk_students(db=db, current_user=student_user)
    assert "403" in str(excinfo.value) or "not authorized" in str(excinfo.value).lower()

def test_backtest_script_runs_clean():
    """Ensures backtest script executes completely with zero exceptions."""
    run_backtest()
