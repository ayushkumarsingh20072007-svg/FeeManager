import pytest
import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from seed import run_seed

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initializes the database and runs seed data before running tests, and restores clean state on teardown."""
    run_seed()
    yield
    run_seed()

@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture(scope="module")
def auth_headers(client):
    """Admin/Accounts Officer Auth Headers fixture."""
    login_resp = client.post("/api/v1/auth/login", json={"email": "accounts@university.edu", "password": "password123"})
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

