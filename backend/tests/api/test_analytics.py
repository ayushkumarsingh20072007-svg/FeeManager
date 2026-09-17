import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.models.users import User, Student
from app.models.enums import UserRole

client = TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def get_auth_header(email: str, password: str = "password123"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_collection_trend_endpoint(db: Session):
    headers = get_auth_header("admin@university.edu")
    res = client.get("/api/v1/analytics/collection-trend?months=6", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert len(data["data"]) == 6
    assert data["total_collected_6m"] >= 0.0
    for item in data["data"]:
        assert "month" in item
        assert "collected" in item
        assert "target" in item
        assert "achievement_percentage" in item

def test_aging_distribution_endpoint(db: Session):
    headers = get_auth_header("admin@university.edu")
    res = client.get("/api/v1/analytics/aging-distribution", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert len(data["data"]) == 4
    bucket_counts_sum = sum(b["count"] for b in data["data"])
    assert bucket_counts_sum == data["total_defaulters"]
    assert data["total_outstanding"] >= 0.0

def test_program_defaulter_heatmap_endpoint(db: Session):
    headers = get_auth_header("admin@university.edu")
    res = client.get("/api/v1/analytics/program-defaulter-heatmap", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "programs" in data
    assert "buckets" in data
    assert "matrix" in data
    assert "details" in data
    assert len(data["matrix"]) == len(data["programs"])
    assert len(data["matrix"][0]) == len(data["buckets"])

def test_analytics_rbac_student_forbidden(db: Session):
    # Log in as student STU1001 (password is STU1001)
    headers = get_auth_header("aravind.k@student.edu", "STU1001")
    
    res1 = client.get("/api/v1/analytics/collection-trend", headers=headers)
    assert res1.status_code == 403

    res2 = client.get("/api/v1/analytics/aging-distribution", headers=headers)
    assert res2.status_code == 403

    res3 = client.get("/api/v1/analytics/program-defaulter-heatmap", headers=headers)
    assert res3.status_code == 403
