from fastapi.testclient import TestClient

def test_login_successful_for_accounts_officer(client: TestClient):
    """Verifies that an Accounts Officer can log in and receives JWT access/refresh tokens."""
    payload = {
        "email": "accounts@university.edu",
        "password": "password123"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "ACCOUNTS_OFFICER"
    assert data["user"]["email"] == "accounts@university.edu"

def test_login_successful_for_student(client: TestClient):
    """Verifies that a student user receives profile info with roll number and student ID."""
    payload = {
        "email": "aravind.k@student.edu",
        "password": "password123"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "STUDENT"
    assert data["user"]["roll_no"] == "STU1001"
    assert data["user"]["student_id"] is not None

def test_login_invalid_password_fails(client: TestClient):
    """Verifies that wrong credentials are rejected with HTTP 401."""
    payload = {
        "email": "accounts@university.edu",
        "password": "wrong_password"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_get_me_authenticated(client: TestClient):
    """Verifies that the /api/v1/auth/me returns the current user profile when authenticated."""
    # First login
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "director@university.edu",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    # Call /me
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "director@university.edu"
    assert me_data["role"] == "MANAGEMENT"
    assert me_data["is_active"] is True

def test_get_me_unauthorized_without_token(client: TestClient):
    """Verifies that /me returns 403/401 when no token is supplied."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code in [401, 403]
