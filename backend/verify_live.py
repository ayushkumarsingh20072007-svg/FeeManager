import httpx

def verify_live_api():
    base_url = "http://127.0.0.1:8000"
    
    print("1. Testing GET /health...")
    r = httpx.get(f"{base_url}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    print("   [OK] Health:", health_data)

    print("\n2. Testing POST /api/v1/auth/login as Accounts Officer...")
    r = httpx.post(f"{base_url}/api/v1/auth/login", json={"email": "accounts@university.edu", "password": "password123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    accounts_token = r.json()["access_token"]
    print("   [OK] Login successful, role:", r.json()["user"]["role"])

    print("\n3. Testing GET /api/v1/auth/me...")
    headers = {"Authorization": f"Bearer {accounts_token}"}
    r = httpx.get(f"{base_url}/api/v1/auth/me", headers=headers)
    assert r.status_code == 200, f"Me endpoint failed: {r.text}"
    print("   [OK] Profile:", r.json()["full_name"], "| Role:", r.json()["role"])

    print("\n4. Testing Student Login & Profile...")
    r = httpx.post(f"{base_url}/api/v1/auth/login", json={"email": "aravind.k@student.edu", "password": "password123"})
    assert r.status_code == 200
    student_token = r.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    r = httpx.get(f"{base_url}/api/v1/auth/me", headers=student_headers)
    assert r.status_code == 200
    assert r.json()["roll_no"] == "STU1001"
    print("   [OK] Student verified with Roll No:", r.json()["roll_no"])

    print("\n5. Testing RBAC enforcement...")
    # Student accessing student zone -> 200
    r = httpx.get(f"{base_url}/api/v1/rbac-test/student-only", headers=student_headers)
    assert r.status_code == 200
    print("   [OK] Student accessing student zone: 200 OK")

    # Student accessing finance zone -> 403 Forbidden
    r = httpx.get(f"{base_url}/api/v1/rbac-test/finance-only", headers=student_headers)
    assert r.status_code == 403
    print("   [OK] Student accessing finance zone: 403 Forbidden (Blocked as required)")

    # Accounts Officer accessing approver zone -> 403 Forbidden
    r = httpx.get(f"{base_url}/api/v1/rbac-test/approver-only", headers=headers)
    assert r.status_code == 403
    print("   [OK] Accounts officer accessing approver zone: 403 Forbidden (Blocked as required)")

    # Finance Approver login and access approver zone -> 200 OK
    r = httpx.post(f"{base_url}/api/v1/auth/login", json={"email": "finance.approver@university.edu", "password": "password123"})
    approver_token = r.json()["access_token"]
    approver_headers = {"Authorization": f"Bearer {approver_token}"}
    r = httpx.get(f"{base_url}/api/v1/rbac-test/approver-only", headers=approver_headers)
    assert r.status_code == 200
    print("   [OK] Finance approver accessing approver zone: 200 OK")

    print("\n6. Testing Audit Logs endpoint (/api/v1/audit-logs)...")
    r = httpx.post(f"{base_url}/api/v1/auth/login", json={"email": "director@university.edu", "password": "password123"})
    mgmt_token = r.json()["access_token"]
    mgmt_headers = {"Authorization": f"Bearer {mgmt_token}"}
    r = httpx.get(f"{base_url}/api/v1/audit-logs", headers=mgmt_headers)
    assert r.status_code == 200
    logs = r.json()
    print(f"   [OK] Retrieved {len(logs)} immutable audit log records")

    print("\n==============================================")
    print(" ALL LIVE ENDPOINT VERIFICATIONS PASSED 100%! ")
    print("==============================================")

if __name__ == "__main__":
    verify_live_api()
