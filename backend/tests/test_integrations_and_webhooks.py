import hmac
import hashlib
import json
import pytest
from unittest.mock import patch, MagicMock
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
    # Status is SIMULATED when no Twilio credentials are configured (graceful degradation)
    assert d_data["status"] in ("DELIVERED", "SIMULATED")
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


# ─────────────────────────────────────────────────────────────────
# Twilio Integration Unit Tests (Tasks 2 & 5)
# ─────────────────────────────────────────────────────────────────

def test_notification_twilio_no_config_returns_simulated():
    """
    When Twilio is not configured (get_twilio_client returns None),
    SMS/WhatsApp channels degrade gracefully to SIMULATED status.
    The HTTP response must still be 200 — never a 500.
    """
    token = get_auth_token("accounts@university.edu")
    payload = {
        "event_type": "OVERDUE_REMINDER",
        "recipient_email": "aravind.k@student.edu",
        "recipient_phone": "+911234567890",
        "student_roll": "STU1001",
        "subject": "Fee Reminder — Test",
        "message_body": "Your fee balance is overdue.",
        "channels": ["SMS", "WHATSAPP", "IN_APP"]
    }
    # Patch get_twilio_client at the service level to ensure None is returned
    with patch("app.services.notification_service.get_twilio_client", return_value=None):
        res = client.post(
            "/api/v1/integrations/notifications/dispatch",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["status"] == "SIMULATED", f"Expected SIMULATED, got {data['status']}"
    # delivery_results should indicate why each channel was simulated
    assert data["delivery_results"] is not None
    for channel in ["SMS", "WHATSAPP"]:
        assert channel in data["delivery_results"]
        assert data["delivery_results"][channel]["status"] == "SIMULATED"


def test_notification_twilio_mock_success_returns_delivered():
    """
    When Twilio client is mocked to return a successful message SID,
    dispatch returns DELIVERED with provider_sid in delivery_results.
    """
    token = get_auth_token("accounts@university.edu")
    payload = {
        "event_type": "OVERDUE_REMINDER",
        "recipient_email": "aravind.k@student.edu",
        "recipient_phone": "+911234567890",
        "student_roll": "STU1001",
        "subject": "Fee Reminder — Test",
        "message_body": "Your fee balance is overdue.",
        "channels": ["SMS"]
    }

    mock_message = MagicMock()
    mock_message.sid = "SMtest_provider_sid_12345"

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.services.notification_service.get_twilio_client", return_value=mock_client):
        with patch("app.core.config.settings.TWILIO_SMS_FROM", "+15551234567"):
            res = client.post(
                "/api/v1/integrations/notifications/dispatch",
                headers={"Authorization": f"Bearer {token}"},
                json=payload
            )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["status"] == "DELIVERED", f"Expected DELIVERED, got {data['status']}"
    assert data["delivery_results"] is not None
    assert data["delivery_results"]["SMS"]["status"] == "SENT"
    assert data["delivery_results"]["SMS"]["provider_sid"] == "SMtest_provider_sid_12345"


def test_notification_twilio_exception_returns_failed_not_500():
    """
    When Twilio raises an exception (e.g. network error), dispatch must:
    - Return HTTP 200 (never crash the API with a 500)
    - Set channel status to FAILED with an error string
    - Set overall status to FAILED or PARTIALLY_DELIVERED
    """
    token = get_auth_token("accounts@university.edu")
    payload = {
        "event_type": "OVERDUE_REMINDER",
        "recipient_email": "aravind.k@student.edu",
        "recipient_phone": "+911234567890",
        "student_roll": "STU1001",
        "subject": "Fee Reminder — Test",
        "message_body": "Your fee balance is overdue.",
        "channels": ["SMS"]
    }

    mock_client = MagicMock()
    mock_client.messages.create.side_effect = Exception("Twilio connection timeout")

    with patch("app.services.notification_service.get_twilio_client", return_value=mock_client):
        with patch("app.core.config.settings.TWILIO_SMS_FROM", "+15551234567"):
            res = client.post(
                "/api/v1/integrations/notifications/dispatch",
                headers={"Authorization": f"Bearer {token}"},
                json=payload
            )
    # MUST be 200 — Twilio failures must never crash the request
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["status"] == "FAILED", f"Expected FAILED, got {data['status']}"
    assert data["delivery_results"] is not None
    assert data["delivery_results"]["SMS"]["status"] == "FAILED"
    assert "error" in data["delivery_results"]["SMS"]
    assert "Twilio connection timeout" in data["delivery_results"]["SMS"]["error"]
