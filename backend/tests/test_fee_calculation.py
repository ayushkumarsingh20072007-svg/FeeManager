"""
Comprehensive Test Suite for Deterministic Fee Calculations & Demand Generation — Phase 2.
Tests 20 minimum requirements:
1. Basic gross fee calculation
2. Multiple fee heads
3. Scholarship calculation
4. Concession calculation
5. Waiver calculation
6. Multiple reductions
7. Net fee cannot be negative
8. Decimal precision
9. Correct applicable fee structure resolution
10. Unrelated fee structure rejected
11. Missing fee structure handled
12. Invalid reduction rejected / handled
13. Demand generation
14. Demand item generation
15. Duplicate demand prevention
16. Idempotent demand generation
17. Full-payment demand
18. Installment demand
19. Installment sum validation
20. Invalid installment count rejected
"""
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.models.users import Student
from app.models.fee_structures import FeeStructure
from app.models.fee_demands import FeeDemand, Scholarship, Concession, FeeWaiver
from app.services.fee_calculator import FeeCalculator, to_decimal
from app.services.demand_generator import DemandGenerator

def get_auth_token(client: TestClient, email: str) -> str:
    password = "STU1001" if "student.edu" in email else "password123"
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200
    return login_resp.json()["access_token"]

# 1. Basic gross fee calculation
def test_basic_gross_fee_calculation():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        res = FeeCalculator.calculate_fee(db, student_id=student.id)
        assert res["gross_fee"] == 178000.0
    finally:
        db.close()

# 2. Multiple fee heads
def test_multiple_fee_heads_breakdown():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        res = FeeCalculator.calculate_fee(db, student_id=student.id)
        assert len(res["fee_items"]) == 8
        head_codes = [it["head_code"] for it in res["fee_items"]]
        assert "TUITION" in head_codes
        assert "EXAMINATION" in head_codes
        assert "HOSTEL" in head_codes
        assert sum(it["amount"] for it in res["fee_items"]) == res["gross_fee"]
    finally:
        db.close()

# 3. Scholarship calculation
def test_scholarship_calculation():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1002").first() # Priya Sharma (Merit Scholarship)
        res = FeeCalculator.calculate_fee(db, student_id=student.id)
        assert res["gross_fee"] == 168000.0
        assert res["scholarship_amount"] == 35000.0
        assert res["net_fee"] == 133000.0
    finally:
        db.close()

# 4. Concession calculation
def test_concession_calculation():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1003").first() # Kiran Varma (Sibling Concession)
        res = FeeCalculator.calculate_fee(db, student_id=student.id)
        assert res["gross_fee"] == 178000.0
        assert res["concession_amount"] == 15000.0
        assert res["net_fee"] == 163000.0
    finally:
        db.close()

# 5. Waiver calculation
def test_waiver_calculation():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1014").first() # Meera Iyer (Special Waiver)
        res = FeeCalculator.calculate_fee(db, student_id=student.id)
        assert res["waiver_amount"] == 10000.0
        assert res["net_fee"] == 168000.0
    finally:
        db.close()

# 6. Multiple reductions
def test_multiple_reductions_stacking():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1008").first() # Anusha Rao (SC/ST Welfare)
        res = FeeCalculator.calculate_fee(db, student_id=student.id)
        assert res["gross_fee"] == 178000.0
        assert res["total_reductions"] == 40000.0
        assert res["net_fee"] == 138000.0
    finally:
        db.close()

# 7. Net fee cannot be negative
def test_net_fee_cannot_be_negative():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        # Add a massive temporary scholarship
        temp_sch = Scholarship(
            student_id=student.id,
            name="Super Merit Award",
            scholarship_code="SCH-SUPER-999",
            amount=500000.0,
            grant_authority="Chancellor Special",
            status="APPROVED",
        )
        db.add(temp_sch)
        db.flush()

        res = FeeCalculator.calculate_fee(db, student_id=student.id)
        assert res["net_fee"] == 0.0
        assert res["total_reductions"] >= res["gross_fee"]

        db.rollback()
    finally:
        db.close()

# 8. Decimal precision
def test_decimal_precision_exactness():
    assert to_decimal(100.555) == Decimal("100.56")
    assert to_decimal("178000.00") == Decimal("178000.00")
    assert to_decimal(None) == Decimal("0.00")

# 9. Correct applicable fee structure resolution
def test_correct_applicable_fee_structure():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1004").first() # Deepika Reddy (Management Quota)
        fs = FeeCalculator.resolve_applicable_fee_structure(db, student=student)
        assert fs.total_amount == 248000.0
        assert fs.category.code == "MGMT"
    finally:
        db.close()

# 10. Unrelated fee structure rejected
def test_unrelated_fee_structure_rejected(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student_cse = db.query(Student).filter(Student.roll_no == "STU1001").first()
        fs_ece = db.query(FeeStructure).filter(FeeStructure.total_amount == 168000.0).first()

        resp = client.post("/api/v1/fees/calculate", json={
            "student_id": student_cse.id,
            "fee_structure_id": fs_ece.id
        }, headers=headers)
        assert resp.status_code == 422
        assert "does not match" in resp.json()["detail"].lower()
    finally:
        db.close()

# 11. Missing fee structure handled
def test_missing_fee_structure_handled(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        resp = client.post("/api/v1/fees/calculate", json={
            "student_id": student.id,
            "academic_year_id": "non-existent-ay-id-999"
        }, headers=headers)
        assert resp.status_code == 404
    finally:
        db.close()

# 12. Invalid reduction rejected / handled
def test_invalid_reduction_handled():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        # Revoked scholarship should not affect net fee
        rev_sch = Scholarship(
            student_id=student.id,
            name="Revoked Scholarship",
            scholarship_code="SCH-REV-001",
            amount=50000.0,
            grant_authority="Revoked Authority",
            status="REVOKED",
        )
        db.add(rev_sch)
        db.flush()

        res = FeeCalculator.calculate_fee(db, student_id=student.id)
        assert res["scholarship_amount"] == 0.0
        assert res["net_fee"] == 178000.0

        db.rollback()
    finally:
        db.close()

# 13. Demand generation
def test_demand_generation_api(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1002").first()
        resp = client.post("/api/v1/fees/demands/generate", json={
            "student_id": student.id
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["student_roll"] == "STU1002"
        assert data["net_demand"] == 133000.0
    finally:
        db.close()

# 14. Demand item generation
def test_demand_item_generation(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        resp = client.post("/api/v1/fees/demands/generate", json={
            "student_id": student.id
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["fee_items"]) > 0
        gross_sum = sum(it["gross_amount"] for it in data["fee_items"])
        assert gross_sum == data["gross_demand"]
    finally:
        db.close()

# 15. Duplicate demand prevention & 16. Idempotent demand generation
def test_idempotent_demand_generation(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        initial_count = db.query(FeeDemand).filter(FeeDemand.student_id == student.id).count()

        # Run demand generation twice
        resp1 = client.post("/api/v1/fees/demands/generate", json={"student_id": student.id}, headers=headers)
        assert resp1.status_code == 200
        assert resp1.json()["is_reused"] is True

        resp2 = client.post("/api/v1/fees/demands/generate", json={"student_id": student.id}, headers=headers)
        assert resp2.status_code == 200
        assert resp2.json()["is_reused"] is True
        assert resp1.json()["demand_id"] == resp2.json()["demand_id"]

        final_count = db.query(FeeDemand).filter(FeeDemand.student_id == student.id).count()
        assert initial_count == final_count
    finally:
        db.close()

# 17. Full-payment demand
def test_full_payment_demand_preview(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        resp = client.get(f"/api/v1/students/{student.id}/fee-preview", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["net_fee"] == 178000.0
        assert len(data["installment_schedule"]) == 0
    finally:
        db.close()

# 18. Installment demand & 19. Installment sum validation
def test_installment_schedule_sum_equality(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1002").first() # Net = 133,000
        resp = client.post("/api/v1/fees/calculate", json={
            "student_id": student.id,
            "installment_count": 3
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["installment_schedule"]) == 3
        sum_tranches = sum(t["amount"] for t in data["installment_schedule"])
        assert pytest.approx(sum_tranches, 0.01) == data["net_fee"]
    finally:
        db.close()

# 20. Invalid installment count rejected
def test_invalid_installment_count_rejected(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        resp = client.post("/api/v1/fees/calculate", json={
            "student_id": student.id,
            "installment_count": 7  # Exceeds institutional max
        }, headers=headers)
        assert resp.status_code == 422
    finally:
        db.close()
