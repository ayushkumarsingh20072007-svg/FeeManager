"""
Comprehensive Test Suite for Official Fee Receipts & PDF Generation — Phase 2.
Tests requirements 21 to 38:
21. Receipt generated for valid payment
22. Receipt number is unique
23. Receipt contains correct student
24. Receipt contains correct fee details
25. Receipt contains correct current payment
26. Receipt contains correct total paid
27. Receipt contains correct outstanding
28. Partial payment receipt
29. Fully paid receipt
30. Receipt PDF endpoint returns application/pdf
31. Receipt PDF contains expected receipt identifier / valid PDF bytes
32. Student can access own receipt
33. Student cannot access another student's receipt (403 Forbidden)
34. Parent can access linked ward receipt
35. Parent cannot access unrelated receipt (403 Forbidden)
36. Finance officer can access authorized receipt
37. Unauthorized receipt request blocked (401 / 403)
38. Audit event generated on PDF download
"""
import pytest
from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.models.users import Student
from app.models.payments import Payment
from app.models.documents import Receipt
from app.models.audit import AuditLog
from app.services.receipt_generator import ReceiptGenerator

def get_auth_token(client: TestClient, email: str) -> str:
    student_pw_map = {
        "aravind.k@student.edu": "STU1001",
        "priya.s@student.edu": "STU1002",
    }
    password = student_pw_map.get(email, "password123")
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200
    return login_resp.json()["access_token"]

# 21. Receipt generated for valid payment
def test_receipt_generated_for_valid_payment():
    db = SessionLocal()
    try:
        payment = db.query(Payment).first()
        rcp = ReceiptGenerator.get_or_create_receipt(db, payment_id=payment.id)
        assert rcp["receipt_number"] is not None
        assert rcp["payment_id"] == payment.id
        assert rcp["current_payment_amount"] == payment.amount
    finally:
        db.close()

# 22. Receipt number is unique
def test_receipt_number_is_unique():
    db = SessionLocal()
    try:
        payments = db.query(Payment).limit(3).all()
        receipt_numbers = set()
        for p in payments:
            rcp = ReceiptGenerator.get_or_create_receipt(db, payment_id=p.id)
            receipt_numbers.add(rcp["receipt_number"])
        assert len(receipt_numbers) == len(payments)
    finally:
        db.close()

# 23. Receipt contains correct student
def test_receipt_contains_correct_student():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        payment = db.query(Payment).filter(Payment.student_id == student.id).first()
        rcp = ReceiptGenerator.get_or_create_receipt(db, payment_id=payment.id)
        assert rcp["student_roll"] == "STU1001"
        assert rcp["student_name"] == "Aravind Kumar"
    finally:
        db.close()

# 24. Receipt contains correct fee details
def test_receipt_contains_correct_fee_details():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        payment = db.query(Payment).filter(Payment.student_id == student.id).first()
        rcp = ReceiptGenerator.get_or_create_receipt(db, payment_id=payment.id)
        assert len(rcp["fee_head_items"]) > 0
        total_allocated = sum(it["allocated_amount"] for it in rcp["fee_head_items"])
        assert total_allocated > 0
    finally:
        db.close()

# 25. Receipt contains correct current payment, 26. Total paid, 27. Outstanding
def test_receipt_financial_breakdown_accuracy():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        payment = db.query(Payment).filter(Payment.student_id == student.id).first()
        rcp = ReceiptGenerator.get_or_create_receipt(db, payment_id=payment.id)
        assert rcp["current_payment_amount"] == 178000.0
        assert rcp["cumulative_paid"] == 178000.0
        assert rcp["net_demand"] == 178000.0
        assert rcp["remaining_outstanding"] == 0.0
    finally:
        db.close()

# 28. Partial payment receipt
def test_partial_payment_receipt():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1002").first() # Priya Sharma (Partial payment: 15,000 paid, 118,000 due)
        payment = db.query(Payment).filter(Payment.student_id == student.id).first()
        rcp = ReceiptGenerator.get_or_create_receipt(db, payment_id=payment.id)
        assert rcp["remaining_outstanding"] == 118000.0
        assert rcp["current_payment_amount"] == 15000.0
        assert rcp["current_payment_amount"] < rcp["net_demand"]
    finally:
        db.close()

# 29. Fully paid receipt
def test_fully_paid_receipt():
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first() # Aravind Kumar (Fully Paid)
        payment = db.query(Payment).filter(Payment.student_id == student.id).first()
        rcp = ReceiptGenerator.get_or_create_receipt(db, payment_id=payment.id)
        assert rcp["remaining_outstanding"] == 0.0
        assert rcp["cumulative_paid"] == 178000.0
        assert rcp["net_demand"] == 178000.0
    finally:
        db.close()

# 30. Receipt PDF endpoint returns application/pdf & 31. Valid PDF bytes
def test_receipt_pdf_generation_endpoint(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        payment = db.query(Payment).first()
        resp = client.get(f"/api/v1/payments/{payment.id}/receipt/pdf", headers=headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF")
        assert len(resp.content) > 500  # Non-trivial PDF size
    finally:
        db.close()

# 32. Student can access own receipt (JSON & PDF)
def test_student_can_access_own_receipt(client: TestClient):
    token = get_auth_token(client, "aravind.k@student.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        payment = db.query(Payment).filter(Payment.student_id == student.id).first()

        # 1. JSON
        resp = client.get(f"/api/v1/payments/{payment.id}/receipt", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["student_roll"] == "STU1001"

        # 2. PDF
        resp_pdf = client.get(f"/api/v1/payments/{payment.id}/receipt/pdf", headers=headers)
        assert resp_pdf.status_code == 200
        assert resp_pdf.headers["content-type"] == "application/pdf"
        assert resp_pdf.content.startswith(b"%PDF")
        assert len(resp_pdf.content) > 1000
    finally:
        db.close()

# 33. Student cannot access another student's receipt (403 Forbidden)
def test_student_cannot_access_other_student_receipt(client: TestClient):
    token_aravind = get_auth_token(client, "aravind.k@student.edu")
    headers_aravind = {"Authorization": f"Bearer {token_aravind}"}

    db = SessionLocal()
    try:
        student_priya = db.query(Student).filter(Student.roll_no == "STU1002").first()
        payment_priya = db.query(Payment).filter(Payment.student_id == student_priya.id).first()

        # 1. JSON -> 403
        resp = client.get(f"/api/v1/payments/{payment_priya.id}/receipt", headers=headers_aravind)
        assert resp.status_code == 403

        # 2. PDF -> 403
        resp_pdf = client.get(f"/api/v1/payments/{payment_priya.id}/receipt/pdf", headers=headers_aravind)
        assert resp_pdf.status_code == 403
    finally:
        db.close()

# 34. Parent can access linked ward receipt (JSON & PDF)
def test_parent_can_access_linked_ward_receipt(client: TestClient):
    token_parent = get_auth_token(client, "parent.aravind@gmail.com")
    headers = {"Authorization": f"Bearer {token_parent}"}

    db = SessionLocal()
    try:
        student_aravind = db.query(Student).filter(Student.roll_no == "STU1001").first()
        payment_aravind = db.query(Payment).filter(Payment.student_id == student_aravind.id).first()

        # 1. JSON
        resp = client.get(f"/api/v1/payments/{payment_aravind.id}/receipt", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["student_roll"] == "STU1001"

        # 2. PDF
        resp_pdf = client.get(f"/api/v1/payments/{payment_aravind.id}/receipt/pdf", headers=headers)
        assert resp_pdf.status_code == 200
        assert resp_pdf.headers["content-type"] == "application/pdf"
        assert resp_pdf.content.startswith(b"%PDF")
        assert len(resp_pdf.content) > 1000
    finally:
        db.close()

# 35. Parent cannot access unrelated receipt (403 Forbidden)
def test_parent_cannot_access_unrelated_receipt(client: TestClient):
    token_parent = get_auth_token(client, "parent.aravind@gmail.com")
    headers = {"Authorization": f"Bearer {token_parent}"}

    db = SessionLocal()
    try:
        student_priya = db.query(Student).filter(Student.roll_no == "STU1002").first()
        payment_priya = db.query(Payment).filter(Payment.student_id == student_priya.id).first()

        # 1. JSON -> 403
        resp = client.get(f"/api/v1/payments/{payment_priya.id}/receipt", headers=headers)
        assert resp.status_code == 403

        # 2. PDF -> 403
        resp_pdf = client.get(f"/api/v1/payments/{payment_priya.id}/receipt/pdf", headers=headers)
        assert resp_pdf.status_code == 403
    finally:
        db.close()

# 36. Finance officer can access authorized receipt (JSON & PDF)
def test_finance_officer_can_access_receipt(client: TestClient):
    token_accounts = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token_accounts}"}

    db = SessionLocal()
    try:
        payment = db.query(Payment).first()
        resp = client.get(f"/api/v1/payments/{payment.id}/receipt", headers=headers)
        assert resp.status_code == 200

        resp_pdf = client.get(f"/api/v1/payments/{payment.id}/receipt/pdf", headers=headers)
        assert resp_pdf.status_code == 200
        assert resp_pdf.headers["content-type"] == "application/pdf"
        assert resp_pdf.content.startswith(b"%PDF")
    finally:
        db.close()

# 37. Unauthorized receipt request blocked (401)
def test_unauthorized_receipt_request_blocked(client: TestClient):
    db = SessionLocal()
    try:
        payment = db.query(Payment).first()
        # 1. JSON -> 401
        resp = client.get(f"/api/v1/payments/{payment.id}/receipt")
        assert resp.status_code == 401

        # 2. PDF -> 401
        resp_pdf = client.get(f"/api/v1/payments/{payment.id}/receipt/pdf")
        assert resp_pdf.status_code == 401
    finally:
        db.close()

# 38. Audit event generated on PDF download
def test_audit_event_generated_on_pdf_download(client: TestClient):
    token = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        payment = db.query(Payment).first()
        initial_logs = db.query(AuditLog).filter(AuditLog.resource_type == "RECEIPT_PDF").count()

        resp = client.get(f"/api/v1/payments/{payment.id}/receipt/pdf", headers=headers)
        assert resp.status_code == 200

        final_logs = db.query(AuditLog).filter(AuditLog.resource_type == "RECEIPT_PDF").count()
        assert final_logs > initial_logs
    finally:
        db.close()
