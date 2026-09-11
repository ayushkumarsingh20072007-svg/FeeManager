from fastapi.testclient import TestClient

def test_health_check_returns_healthy(client: TestClient):
    """Verifies that the /health endpoint returns 200 with healthy database."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["version"] == "0.1.0"
    assert "details" in data
