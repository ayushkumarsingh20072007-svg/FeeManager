from fastapi.testclient import TestClient

def get_auth_header(client: TestClient, email: str) -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_student_can_access_student_endpoint(client: TestClient):
    headers = get_auth_header(client, "aravind.k@student.edu")
    resp = client.get("/api/v1/rbac-test/student-only", headers=headers)
    assert resp.status_code == 200
    assert "Student/Parent zone" in resp.json()["message"]

def test_student_cannot_access_finance_endpoint(client: TestClient):
    headers = get_auth_header(client, "aravind.k@student.edu")
    resp = client.get("/api/v1/rbac-test/finance-only", headers=headers)
    assert resp.status_code == 403
    assert "Access Denied" in resp.json()["detail"]

def test_accounts_officer_can_access_finance_endpoint(client: TestClient):
    headers = get_auth_header(client, "accounts@university.edu")
    resp = client.get("/api/v1/rbac-test/finance-only", headers=headers)
    assert resp.status_code == 200
    assert "Financial Operations zone" in resp.json()["message"]

def test_accounts_officer_cannot_access_approver_endpoint(client: TestClient):
    """Accounts Officer cannot approve without FINANCE_APPROVER role."""
    headers = get_auth_header(client, "accounts@university.edu")
    resp = client.get("/api/v1/rbac-test/approver-only", headers=headers)
    assert resp.status_code == 403
    assert "Access Denied" in resp.json()["detail"]

def test_finance_approver_can_access_approver_endpoint(client: TestClient):
    headers = get_auth_header(client, "finance.approver@university.edu")
    resp = client.get("/api/v1/rbac-test/approver-only", headers=headers)
    assert resp.status_code == 200
    assert "Financial Sign-off & Approval zone" in resp.json()["message"]
