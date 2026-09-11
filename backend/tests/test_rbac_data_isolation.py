"""
Security Hardening & RBAC Data Isolation Regression Test Suite.
Tests:
1. Student can access own record.
2. Student cannot access another student's record (403 Forbidden).
3. Student cannot list all students (returns only own single record).
4. Student cannot bypass isolation via query parameters (search, program, pagination).
5. Student cannot access another student's outstanding balance.
6. Student cannot access another student's payment history.
7. Student cannot access another student's fee demand (403 Forbidden).
8. Student stats are scoped strictly to self.
9. Parent can access linked child.
10. Parent cannot access unrelated student (403 Forbidden).
11. Parent list returns only linked wards.
12. Parent cannot access unrelated payments.
13. Accounts Officer can access all 28 students.
14. Finance Approver retains authorized financial access.
15. Unauthenticated requests return 401.
16. Tampered student_id in URL returns 403.
17. Student cannot access reconciliation mismatches (403 Forbidden).
18. Student cannot access approvals or refund claims (403 Forbidden).
"""
import pytest
from fastapi.testclient import TestClient

def get_auth_token(client: TestClient, email: str) -> str:
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert login_resp.status_code == 200
    return login_resp.json()["access_token"]

# 1. Student can access own record
def test_student_can_access_own_record(client: TestClient):
    token = get_auth_token(client, "aravind.k@student.edu")
    headers = {"Authorization": f"Bearer {token}"}

    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    student_id = me_resp.json()["student_id"]
    assert student_id is not None

    resp = client.get(f"/api/v1/ledger/students/{student_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["roll_no"] == "STU1001"
    assert data["name"] == "Aravind Kumar"

# 2. Student cannot access another student's record (403 Forbidden)
def test_student_cannot_access_another_student_record_by_id(client: TestClient):
    token_aravind = get_auth_token(client, "aravind.k@student.edu")
    token_priya = get_auth_token(client, "priya.s@student.edu")

    # Get Priya's student ID
    me_priya = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_priya}"}).json()
    priya_student_id = me_priya["student_id"]

    # Aravind attempts direct ID access to Priya's record
    headers_aravind = {"Authorization": f"Bearer {token_aravind}"}
    resp = client.get(f"/api/v1/ledger/students/{priya_student_id}", headers=headers_aravind)
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"].lower()

# 3. Student list returns only own record
def test_student_list_returns_only_own_record(client: TestClient):
    token = get_auth_token(client, "aravind.k@student.edu")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/ledger/students", headers=headers)
    assert resp.status_code == 200
    students = resp.json()
    assert len(students) == 1
    assert students[0]["roll_no"] == "STU1001"

# 4. Student cannot bypass isolation via query parameters
def test_student_cannot_bypass_list_via_query_params(client: TestClient):
    token = get_auth_token(client, "aravind.k@student.edu")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to search for Priya or other programs
    resp_search = client.get("/api/v1/ledger/students?search=Priya", headers=headers)
    assert resp_search.status_code == 200
    assert len(resp_search.json()) == 0

    resp_program = client.get("/api/v1/ledger/students?program=BTECH-ECE", headers=headers)
    assert resp_program.status_code == 200
    assert len(resp_program.json()) == 0

    resp_page = client.get("/api/v1/ledger/students?limit=100&offset=0", headers=headers)
    assert resp_page.status_code == 200
    assert len(resp_page.json()) == 1

# 5. Student cannot access another student's outstanding balance
def test_student_cannot_access_another_student_outstanding(client: TestClient):
    token_aravind = get_auth_token(client, "aravind.k@student.edu")
    token_priya = get_auth_token(client, "priya.s@student.edu")

    me_priya = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_priya}"}).json()
    priya_student_id = me_priya["student_id"]

    # Aravind tries to query Priya's demands
    resp = client.get(f"/api/v1/fee-demands/student/{priya_student_id}", headers={"Authorization": f"Bearer {token_aravind}"})
    assert resp.status_code == 403

# 6. Student cannot access another student's payment history
def test_student_cannot_access_another_student_payments(client: TestClient):
    token_aravind = get_auth_token(client, "aravind.k@student.edu")
    headers_aravind = {"Authorization": f"Bearer {token_aravind}"}

    resp = client.get("/api/v1/ledger/payments", headers=headers_aravind)
    assert resp.status_code == 200
    payments = resp.json()
    for p in payments:
        assert p["student_roll"] == "STU1001"

# 7. Student cannot access another student's fee demand
def test_student_cannot_access_another_student_fee_demand(client: TestClient):
    token_aravind = get_auth_token(client, "aravind.k@student.edu")
    token_priya = get_auth_token(client, "priya.s@student.edu")

    # Get Priya's fee demand ID
    priya_demands = client.get(f"/api/v1/fee-demands/student/{client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token_priya}'}).json()['student_id']}", headers={"Authorization": f"Bearer {token_priya}"}).json()
    assert len(priya_demands) > 0
    priya_demand_id = priya_demands[0]["id"]

    # Aravind tries to fetch Priya's demand by ID
    resp = client.get(f"/api/v1/fee-demands/{priya_demand_id}", headers={"Authorization": f"Bearer {token_aravind}"})
    assert resp.status_code == 403

# 8. Student stats are scoped strictly to self
def test_student_stats_scoped_to_self(client: TestClient):
    token_aravind = get_auth_token(client, "aravind.k@student.edu")
    headers = {"Authorization": f"Bearer {token_aravind}"}

    resp = client.get("/api/v1/ledger/stats", headers=headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total_students"] == 1
    assert stats["total_demand"] == 178000.0
    assert stats["total_collected"] == 148000.0
    assert stats["total_outstanding"] == 30000.0

# 9. Parent can access linked child
def test_parent_can_access_linked_child(client: TestClient):
    token_parent = get_auth_token(client, "parent.aravind@gmail.com")
    headers = {"Authorization": f"Bearer {token_parent}"}

    resp_students = client.get("/api/v1/ledger/students", headers=headers)
    assert resp_students.status_code == 200
    students = resp_students.json()
    assert len(students) == 1
    assert students[0]["roll_no"] == "STU1001"

    child_id = students[0]["id"]
    resp_detail = client.get(f"/api/v1/ledger/students/{child_id}", headers=headers)
    assert resp_detail.status_code == 200
    assert resp_detail.json()["roll_no"] == "STU1001"

# 10. Parent cannot access unrelated student (403 Forbidden)
def test_parent_cannot_access_unrelated_student(client: TestClient):
    token_parent = get_auth_token(client, "parent.aravind@gmail.com")
    token_priya = get_auth_token(client, "priya.s@student.edu")

    me_priya = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_priya}"}).json()
    priya_student_id = me_priya["student_id"]

    headers_parent = {"Authorization": f"Bearer {token_parent}"}
    resp = client.get(f"/api/v1/ledger/students/{priya_student_id}", headers=headers_parent)
    assert resp.status_code == 403

# 11. Parent list returns only linked wards
def test_parent_list_returns_only_linked_wards(client: TestClient):
    token_parent = get_auth_token(client, "parent.aravind@gmail.com")
    headers = {"Authorization": f"Bearer {token_parent}"}

    resp = client.get("/api/v1/ledger/students?limit=100", headers=headers)
    assert resp.status_code == 200
    students = resp.json()
    assert len(students) == 1
    assert students[0]["roll_no"] == "STU1001"

# 12. Parent cannot access unrelated payments
def test_parent_cannot_access_unrelated_payments(client: TestClient):
    token_parent = get_auth_token(client, "parent.aravind@gmail.com")
    headers = {"Authorization": f"Bearer {token_parent}"}

    resp = client.get("/api/v1/ledger/payments", headers=headers)
    assert resp.status_code == 200
    payments = resp.json()
    for p in payments:
        assert p["student_roll"] == "STU1001"

# 13. Accounts Officer can access all 28 students
def test_accounts_officer_can_access_all_students(client: TestClient):
    token_accounts = get_auth_token(client, "accounts@university.edu")
    headers = {"Authorization": f"Bearer {token_accounts}"}

    resp = client.get("/api/v1/ledger/students?limit=100", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 28

    resp_stats = client.get("/api/v1/ledger/stats", headers=headers)
    assert resp_stats.status_code == 200
    assert resp_stats.json()["total_students"] == 28

# 14. Finance Approver retains authorized financial access
def test_finance_approver_retains_authorized_financial_access(client: TestClient):
    token_approver = get_auth_token(client, "finance.approver@university.edu")
    headers = {"Authorization": f"Bearer {token_approver}"}

    resp_stats = client.get("/api/v1/ledger/stats", headers=headers)
    assert resp_stats.status_code == 200
    assert resp_stats.json()["total_students"] == 28

    resp_approvals = client.get("/api/v1/ledger/approvals", headers=headers)
    assert resp_approvals.status_code == 200
    assert len(resp_approvals.json()) > 0

# 15. Unauthenticated requests return 401
def test_unauthenticated_requests_return_401(client: TestClient):
    resp_stats = client.get("/api/v1/ledger/stats")
    assert resp_stats.status_code == 401

    resp_students = client.get("/api/v1/ledger/students")
    assert resp_students.status_code == 401

# 16. Tampered student_id in URL returns 403
def test_tampered_student_id_in_url_blocked(client: TestClient):
    token = get_auth_token(client, "aravind.k@student.edu")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/ledger/students/random-tampered-uuid-12345", headers=headers)
    assert resp.status_code == 403

# 17. Student cannot access reconciliation mismatches
def test_student_cannot_access_reconciliation_mismatches(client: TestClient):
    token = get_auth_token(client, "aravind.k@student.edu")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/ledger/mismatches", headers=headers)
    assert resp.status_code == 403

# 18. Student cannot access approvals or refund claims
def test_student_cannot_access_approvals_or_refunds(client: TestClient):
    token = get_auth_token(client, "aravind.k@student.edu")
    headers = {"Authorization": f"Bearer {token}"}

    resp_appr = client.get("/api/v1/ledger/approvals", headers=headers)
    assert resp_appr.status_code == 403

    resp_ref = client.get("/api/v1/ledger/refunds", headers=headers)
    assert resp_ref.status_code == 403
