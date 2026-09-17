from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.models.audit import AuditLog
from app.models.enums import AuditAction, UserRole
from app.services.audit_service import AuditService

def test_audit_log_append_and_query():
    db = SessionLocal()
    try:
        service = AuditService(db)
        log_entry = service.log(
            action=AuditAction.READ,
            resource_type="TEST_FINANCIAL_RESOURCE",
            resource_id="TEST_001",
            reason="Test automated audit event",
            old_value=None,
            new_value={"test": "data"}
        )
        assert log_entry.id is not None
        assert log_entry.resource_type == "TEST_FINANCIAL_RESOURCE"

        # Query back
        logs = service.list_logs(resource_type="TEST_FINANCIAL_RESOURCE")
        assert len(logs) >= 1
        assert logs[0].resource_type == "TEST_FINANCIAL_RESOURCE"
    finally:
        db.close()

def test_audit_logs_api_accessible_by_admin(client: TestClient):
    # Login as admin
    login_resp = client.post("/api/v1/auth/login", json={"email": "admin@university.edu", "password": "password123"})
    token = login_resp.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/audit-logs", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) > 0

def test_audit_logs_api_blocked_for_students(client: TestClient):
    # Login as student
    login_resp = client.post("/api/v1/auth/login", json={"email": "aravind.k@student.edu", "password": "STU1001"})
    token = login_resp.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/audit-logs", headers=headers)
    assert resp.status_code == 403
