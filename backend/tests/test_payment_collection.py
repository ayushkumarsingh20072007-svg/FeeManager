"""
Tests for Phase 3 — Payment Collection, Recording, Reversals, and RBAC Security.
"""
import pytest
from fastapi.testclient import TestClient
from app.models.enums import PaymentChannel, PaymentStatus

def test_valid_payment_creation(client: TestClient, auth_headers: dict):
    """Verifies that an Accounts Officer can record an official payment for a student."""
    # Find student STU1007 (Manoj Tiwari - PENDING with 1,68,000 outstanding)
    payload = {
        "student_id": "STU1007",
        "amount": 50000.0,
        "channel": "COUNTER",
        "transaction_id": "TXN-TEST-1007-01",
        "notes": "Cash counter payment installment 1",
    }
    resp = client.post("/api/v1/payments", json=payload, headers=auth_headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["amount"] == 50000.0
    assert data["student_roll"] == "STU1007"
    assert data["status"] == "RECEIVED"
    assert len(data["allocations"]) > 0
    assert data["receipt_number"] is not None

def test_invalid_payment_amount_zero_or_negative(client: TestClient, auth_headers: dict):
    """Rejects payment amount <= 0."""
    payload = {
        "student_id": "STU1007",
        "amount": 0.0,
        "channel": "COUNTER",
    }
    resp = client.post("/api/v1/payments", json=payload, headers=auth_headers)
    assert resp.status_code == 422

    payload_neg = {
        "student_id": "STU1007",
        "amount": -100.0,
        "channel": "COUNTER",
    }
    resp_neg = client.post("/api/v1/payments", json=payload_neg, headers=auth_headers)
    assert resp_neg.status_code == 422

def test_unauthorized_student_cannot_record_payment(client: TestClient):
    """A student must NOT be able to record arbitrary official financial payment records."""
    login_resp = client.post("/api/v1/auth/login", json={"email": "aravind.k@student.edu", "password": "STU1001"})
    assert login_resp.status_code == 200, login_resp.text
    stu_token = login_resp.json()["access_token"]
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    payload = {
        "student_id": "STU1001",
        "amount": 30000.0,
        "channel": "ONLINE_GATEWAY",
    }
    resp = client.post("/api/v1/payments", json=payload, headers=stu_headers)
    assert resp.status_code == 403

def test_unauthorized_parent_cannot_record_payment(client: TestClient):
    """A parent must NOT be able to record direct official payments without gateway/finance authorization."""
    login_resp = client.post("/api/v1/auth/login", json={"email": "parent.aravind@gmail.com", "password": "password123"})
    assert login_resp.status_code == 200
    parent_token = login_resp.json()["access_token"]
    parent_headers = {"Authorization": f"Bearer {parent_token}"}

    payload = {
        "student_id": "STU1001",
        "amount": 30000.0,
        "channel": "COUNTER",
    }
    resp = client.post("/api/v1/payments", json=payload, headers=parent_headers)
    assert resp.status_code == 403

def test_over_allocation_payment_rejected(client: TestClient, auth_headers: dict):
    """Payment amount exceeding remaining demand outstanding must be rejected with 400 Bad Request."""
    payload = {
        "student_id": "STU1002",
        "amount": 9999999.0,
        "channel": "COUNTER",
    }
    resp = client.post("/api/v1/payments", json=payload, headers=auth_headers)
    assert resp.status_code == 400
    assert "exceeds" in resp.json()["detail"].lower() or "over-allocation" in resp.json()["detail"].lower() or "fully paid" in resp.json()["detail"].lower()

def test_duplicate_transaction_id_rejected(client: TestClient, auth_headers: dict):
    """Duplicate transaction ID submission must be rejected."""
    payload = {
        "student_id": "STU1011",
        "amount": 25000.0,
        "channel": "UPI",
        "transaction_id": "TXN-UNIQUE-DUP-991",
    }
    resp1 = client.post("/api/v1/payments", json=payload, headers=auth_headers)
    assert resp1.status_code == 201

    resp2 = client.post("/api/v1/payments", json=payload, headers=auth_headers)
    assert resp2.status_code == 400
    assert "duplicate" in resp2.json()["detail"].lower()

def test_payment_reversal_by_finance_approver(client: TestClient, auth_headers: dict):
    """Payment reversal deallocates amounts, restores demand outstanding, and logs audit action."""
    # Record payment for STU1013 (Arun Prakash - Net 170000)
    pay_resp = client.post("/api/v1/payments", json={
        "student_id": "STU1013",
        "amount": 70000.0,
        "channel": "NEFT",
        "transaction_id": "TXN-REV-TEST-1013",
        "notes": "Test payment to be reversed",
    }, headers=auth_headers)
    assert pay_resp.status_code == 201
    payment_id = pay_resp.json()["id"]

    # Student cannot reverse
    login_stu = client.post("/api/v1/auth/login", json={"email": "arun.p@student.edu", "password": "STU1013"})
    stu_headers = {"Authorization": f"Bearer {login_stu.json()['access_token']}"}
    resp_stu_rev = client.post(f"/api/v1/payments/{payment_id}/reverse", json={"reason": "Self refund"}, headers=stu_headers)
    assert resp_stu_rev.status_code == 403

    # Finance approver can reverse
    login_approver = client.post("/api/v1/auth/login", json={"email": "finance.approver@university.edu", "password": "password123"})
    approver_headers = {"Authorization": f"Bearer {login_approver.json()['access_token']}"}

    rev_resp = client.post(f"/api/v1/payments/{payment_id}/reverse", json={
        "reason": "Instrument dishonored by clearing bank (NEFT bounce)",
    }, headers=approver_headers)
    assert rev_resp.status_code == 200, rev_resp.text
    rev_data = rev_resp.json()
    assert rev_data["status"] == "REVERSED"
    assert rev_data["reversed_amount"] == 70000.0
    assert rev_data["restored_outstanding"] == 170000.0

def test_student_and_parent_payment_data_isolation(client: TestClient):
    """Student and Parent endpoints enforce data isolation for payment history."""
    # Student STU1001
    login_stu1 = client.post("/api/v1/auth/login", json={"email": "aravind.k@student.edu", "password": "STU1001"})
    stu1_headers = {"Authorization": f"Bearer {login_stu1.json()['access_token']}"}

    # Student can view own payments
    resp_own = client.get("/api/v1/payments", headers=stu1_headers)
    assert resp_own.status_code == 200
    for p in resp_own.json():
        assert p["student_roll"] == "STU1001"

    # Student blocked from querying STU1002 payments directly
    resp_other = client.get("/api/v1/students/STU1002/payments", headers=stu1_headers)
    assert resp_other.status_code == 403

    # Parent of STU1001 can view STU1001 payments but blocked from STU1002
    login_par1 = client.post("/api/v1/auth/login", json={"email": "parent.aravind@gmail.com", "password": "password123"})
    par1_headers = {"Authorization": f"Bearer {login_par1.json()['access_token']}"}

    resp_par_own = client.get("/api/v1/students/STU1001/payments", headers=par1_headers)
    assert resp_par_own.status_code == 200
    for p in resp_par_own.json():
        assert p["student_roll"] == "STU1001"

    resp_par_other = client.get("/api/v1/students/STU1002/payments", headers=par1_headers)
    assert resp_par_other.status_code == 403
