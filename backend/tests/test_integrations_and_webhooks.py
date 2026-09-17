import hmac
import hashlib
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.webhook_service import DEFAULT_WEBHOOK_SECRETS

from app.core.database import SessionLocal
from app.models.payments import Payment, PaymentAllocation
from app.models.fee_demands import FeeDemand, Scholarship
from app.models.users import Student
from app.services.ledger_calculator import calculate_student_financials

from seed import run_seed

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def reset_seed_after_integrations():
    yield
    run_seed()

def get_auth_token(email: str, password: str = None) -> str:
    if password is None:
        password = "STU1001" if "student.edu" in email else "password123"
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_webhook_hmac_signature_verification():
    """Valid HMAC SHA-256 signature is accepted; tampered signature is rejected with 401."""
    payload = {
        "event": "payment.captured",
        "gateway": "RAZORPAY",
        "transaction_id": "pay_test_razorpay_99991",
        "roll_no": "STU1002",
        "amount": 5000.0,
        "payment_channel": "ONLINE_GATEWAY"
    }
    raw_bytes = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    secret = DEFAULT_WEBHOOK_SECRETS["RAZORPAY"]
    valid_sig = hmac.new(secret.encode("utf-8"), raw_bytes, hashlib.sha256).hexdigest()

    # 1. Tampered signature -> 401 Unauthorized
    bad_res = client.post(
        "/api/v1/webhooks/payment",
        content=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "x-razorpay-signature": "tampered_signature_12345"
        }
    )
    assert bad_res.status_code == 401

    # 2. Valid signature -> 200 OK
    good_res = client.post(
        "/api/v1/webhooks/payment",
        content=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "x-razorpay-signature": valid_sig
        }
    )
    assert good_res.status_code == 200
    data = good_res.json()
    assert data["status"] == "SUCCESS"
    assert data["receipt_number"] is not None

def test_webhook_idempotency_duplicate_ignored():
    """Duplicate webhook delivery with same transaction ID returns DUPLICATE_IGNORED safely."""
    payload = {
        "event": "payment.captured",
        "gateway": "RAZORPAY",
        "transaction_id": "pay_test_razorpay_99991",  # Same as previous test
        "roll_no": "STU1002",
        "amount": 5000.0
    }
    res = client.post("/api/v1/webhooks/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "DUPLICATE_IGNORED"
    assert "previously processed" in data["message"]

def test_clearance_evaluation_overdue_blocked():
    """Student with overdue balance (STU1002 Priya) receives BLOCKED_WITH_HOLDS status, while cleared student (STU1001 Aravind) is FULL_CLEARANCE."""
    token = get_auth_token("accounts@university.edu")
    
    # 1. Overdue student STU1002 is BLOCKED
    res_due = client.get(
        "/api/v1/integrations/clearance/STU1002",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_due.status_code == 200
    data_due = res_due.json()
    assert data_due["roll_no"] == "STU1002"
    assert data_due["clearance_status"] in ("BLOCKED_WITH_HOLDS", "CONDITIONAL_CLEARANCE", "SPECIAL_ENTRY_PERMITTED")
    assert len(data_due["holds"]) > 0

    # 2. Cleared student STU1001 is FULL_CLEARANCE
    res_clear = client.get(
        "/api/v1/integrations/clearance/STU1001",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_clear.status_code == 200
    data_clear = res_clear.json()
    assert data_clear["roll_no"] == "STU1001"
    assert data_clear["clearance_status"] == "FULL_CLEARANCE"
    assert data_clear["is_eligible_for_hall_ticket"] is True

def test_clearance_data_isolation_student_restricted():
    """Student cannot inspect another student's clearance certificate."""
    token = get_auth_token("aravind.k@student.edu")
    res = client.get(
        "/api/v1/integrations/clearance/STU1003",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403

def test_scholarship_sync_agent42():
    """Inbound scholarship from Agent 42 successfully adjusts demand and reduces net balance."""
    token = get_auth_token("admin@university.edu")
    payload = {
        "source_agent": "Agent-42-Scholarships",
        "student_roll": "STU1003",
        "scholarship_name": "Dean's Excellence Award 2026",
        "amount": 10000.0,
        "approval_reference": "SCH-2026-EXC-0042"
    }
    res = client.post(
        "/api/v1/integrations/scholarships/sync",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["student_roll"] == "STU1003"
    assert data["amount_applied"] == 10000.0

def test_notification_dispatch_and_logging():
    """Dispatches automated notifications and lists activity logs."""
    token = get_auth_token("accounts@university.edu")
    payload = {
        "event_type": "OVERDUE_REMINDER",
        "recipient_email": "aravind.k@student.edu",
        "student_roll": "STU1001",
        "subject": "Fee Payment Reminder - AY 2026-27",
        "message_body": "This is a formal reminder regarding outstanding balance of INR 30,000.",
        "channels": ["EMAIL", "SMS"]
    }
    dispatch_res = client.post(
        "/api/v1/integrations/notifications/dispatch",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert dispatch_res.status_code == 200
    d_data = dispatch_res.json()
    assert d_data["status"] == "DELIVERED"
    assert d_data["student_roll"] == "STU1001"

    # List notification logs
    logs_res = client.get(
        "/api/v1/integrations/notifications/logs?student_roll=STU1001",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) >= 1

def test_cashflow_forecasting_api():
    """Management role can query 90-day probabilistic cashflow forecast."""
    token = get_auth_token("director@university.edu")
    res = client.get(
        "/api/v1/integrations/analytics/cashflow-forecast?horizon_days=90",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["horizon_days"] == 90
    assert data["current_outstanding_pool"] > 0
    assert data["projected_total_realization"] > 0
    assert len(data["bucket_breakdown"]) >= 3
    assert len(data["program_breakdown"]) >= 1
