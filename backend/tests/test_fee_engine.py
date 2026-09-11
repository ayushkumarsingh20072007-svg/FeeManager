import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.database import Base, engine, get_db
from app.models.users import Student, User
from app.models.academics import AcademicYear, Program, FeeHead
from app.models.fee_structures import FeeStructure, FeeStructureItem
from app.models.fee_demands import FeeDemand, FeeDemandItem, InstallmentPlan
from app.services.fee_engine import FeeCalculationEngine
from app.schemas.fee_demands import (
    FeeCalculationRequest,
    FeeDemandCreateRequest,
    InstallmentPlanCreateRequest,
)
from app.services.auth_service import AuthService

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

def get_auth_token(client: TestClient, email: str = "accounts@university.edu") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_resolve_fee_structure(db_session: Session):
    student = db_session.query(Student).filter(Student.roll_no == "STU1001").first()
    assert student is not None

    struct = FeeCalculationEngine.resolve_structure(db_session, student)
    assert struct is not None
    assert struct.program_id == student.program_id
    assert len(struct.items) > 0

def test_deterministic_demand_calculation_preview(db_session: Session):
    student = db_session.query(Student).filter(Student.roll_no == "STU1001").first()
    req = FeeCalculationRequest(student_id=student.id)

    preview = FeeCalculationEngine.calculate_demand_preview(db_session, req)
    assert preview.gross_demand > 0
    assert preview.net_demand == preview.gross_demand
    assert len(preview.items) > 0
    # Sum of items equals gross
    assert round(sum(it.gross_amount for it in preview.items), 2) == preview.gross_demand

def test_percentage_scholarship_on_tuition(db_session: Session):
    student = db_session.query(Student).filter(Student.roll_no == "STU1001").first()
    req = FeeCalculationRequest(student_id=student.id, scholarship_percentage=50.0)

    preview = FeeCalculationEngine.calculate_demand_preview(db_session, req)
    tuition_item = next(it for it in preview.items if "TUITION" in it.head_code.upper())
    expected_deduction = round(tuition_item.gross_amount * 0.5, 2)
    assert tuition_item.scholarship_deduction == expected_deduction
    assert tuition_item.net_amount == round(tuition_item.gross_amount - expected_deduction, 2)
    assert preview.total_scholarship == expected_deduction
    assert preview.net_demand == round(preview.gross_demand - expected_deduction, 2)

def test_multi_tier_deduction_hierarchy(db_session: Session):
    student = db_session.query(Student).filter(Student.roll_no == "STU1001").first()
    req = FeeCalculationRequest(
        student_id=student.id,
        scholarship_flat=20000.0,
        concession_flat=5000.0,
        waiver_flat=3000.0,
    )

    preview = FeeCalculationEngine.calculate_demand_preview(db_session, req)
    assert preview.total_scholarship == 20000.0
    assert preview.total_concession == 5000.0
    assert preview.total_waiver == 3000.0
    expected_net = preview.gross_demand - 28000.0
    assert preview.net_demand == round(expected_net, 2)
    # Item sum matches net demand
    assert round(sum(it.net_amount for it in preview.items), 2) == preview.net_demand

def test_exact_installment_partition_equality(db_session: Session):
    # Retrieve a demand or create one for test
    demand = db_session.query(FeeDemand).first()
    assert demand is not None

    req = InstallmentPlanCreateRequest(
        plan_name="3-Tranche Installment Plan",
        total_installments=3,
        interval_days=30,
    )

    plan = FeeCalculationEngine.create_installment_schedule(db_session, demand.id, req)
    assert plan.total_installments == 3
    assert len(plan.installments) == 3

    total_installment_amount = round(sum(i.amount for i in plan.installments), 2)
    assert total_installment_amount == round(demand.net_demand, 2)

def test_api_fee_demand_calculate_endpoint(client: TestClient, db_session: Session):
    token = get_auth_token(client, "accounts@university.edu")
    student = db_session.query(Student).filter(Student.roll_no == "STU1001").first()

    res = client.post(
        "/api/v1/fee-demands/calculate",
        json={"student_id": student.id, "scholarship_percentage": 25.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_roll"] == "STU1001"
    assert data["total_scholarship"] > 0
    assert len(data["items"]) > 0

def test_api_fee_demand_generate_official(client: TestClient, db_session: Session):
    token = get_auth_token(client, "accounts@university.edu")
    student = db_session.query(Student).filter(Student.roll_no == "STU1002").first()

    res = client.post(
        "/api/v1/fee-demands/generate",
        json={
            "student_id": student.id,
            "scholarship_amount": 10000.0,
            "scholarship_name": "State Merit Concession",
            "concession_amount": 2000.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_roll"] == "STU1002"
    assert data["scholarship_amount"] == 10000.0
    assert data["concession_amount"] == 2000.0
    assert data["net_demand"] == round(data["gross_demand"] - 12000.0, 2)
    assert data["outstanding_amount"] == data["net_demand"]

def test_student_cannot_generate_official_demand(client: TestClient, db_session: Session):
    student_token = get_auth_token(client, "aravind.k@student.edu")
    student = db_session.query(Student).filter(Student.roll_no == "STU1001").first()

    res = client.post(
        "/api/v1/fee-demands/generate",
        json={"student_id": student.id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    # Student role is blocked by RBAC
    assert res.status_code == 403

def test_excessive_scholarship_floors_at_zero(db_session: Session):
    student = db_session.query(Student).filter(Student.roll_no == "STU1001").first()
    req = FeeCalculationRequest(student_id=student.id, scholarship_flat=9999999.0)

    preview = FeeCalculationEngine.calculate_demand_preview(db_session, req)
    assert preview.net_demand == 0.0
    for it in preview.items:
        assert it.net_amount >= 0.0

def test_invalid_installment_count_rejected(client: TestClient, db_session: Session):
    token = get_auth_token(client, "accounts@university.edu")
    demand = db_session.query(FeeDemand).first()

    res = client.post(
        f"/api/v1/fee-demands/{demand.id}/installments",
        json={"plan_name": "Invalid Plan", "total_installments": 5},
        headers={"Authorization": f"Bearer {token}"},
    )
    # 5 installments is invalid (only 2, 3, 4 allowed)
    assert res.status_code in [400, 422]

