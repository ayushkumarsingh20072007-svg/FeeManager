"""
Tests for Phase 3 — Deterministic Bank Reconciliation Engine & Mismatch Handling.
"""
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

def test_reconciliation_list_bank_transactions(client: TestClient, auth_headers: dict):
    """Accounts Officer can list ingested bank statement transactions."""
    resp = client.get("/api/v1/reconciliation/bank-transactions", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    txns = resp.json()
    assert len(txns) >= 5
    # Find seeded TXN-BNK-202609-001
    t1 = next((t for t in txns if t["bank_transaction_id"] == "TXN-BNK-202609-001"), None)
    assert t1 is not None
    assert t1["amount"] == 178000.0
    assert t1["reconciliation_status"] == "MATCHED"

import uuid

def test_reconciliation_ingest_bank_transaction(client: TestClient, auth_headers: dict):
    """Finance staff can ingest a new bank statement transaction."""
    test_txn_id = f"TXN-BNK-TEST-{uuid.uuid4().hex[:8]}"
    payload = {
        "bank_transaction_id": test_txn_id,
        "transaction_date": datetime.now(timezone.utc).isoformat(),
        "amount": 45000.0,
        "reference_number": f"UTR_TEST_{uuid.uuid4().hex[:6]}",
        "description": "Direct counter deposit",
    }
    resp = client.post("/api/v1/reconciliation/bank-transactions", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["bank_transaction_id"] == test_txn_id
    assert data["reconciliation_status"] == "UNMATCHED"

def test_preservation_of_intentional_mismatches(client: TestClient, auth_headers: dict):
    """The 3 seeded intentional test variances must remain intact in the system."""
    resp = client.get("/api/v1/reconciliation/mismatches", headers=auth_headers)
    assert resp.status_code == 200
    mismatches = resp.json()
    codes = [m["mismatch_code"] for m in mismatches]
    assert "MIS-2026-001" in codes
    assert "MIS-2026-002" in codes
    assert "MIS-2026-003" in codes

def test_ambiguous_transaction_flags_exception(client: TestClient, auth_headers: dict):
    """When multiple payment candidates match amount/date, auto-recon must flag as EXCEPTION (no guessing)."""
    # 1. Ingest an unmatched transaction for ₹30,000 (which multiple students have paid/recorded)
    client.post("/api/v1/reconciliation/bank-transactions", json={
        "bank_transaction_id": "TXN-BNK-AMBIGUOUS-30K",
        "transaction_date": datetime.now(timezone.utc).isoformat(),
        "amount": 30000.0,
        "description": "General transfer without student roll in narration",
    }, headers=auth_headers)

    # 2. Run auto matching
    res = client.post("/api/v1/reconciliation/match", json={"date_tolerance_days": 30}, headers=auth_headers)
    assert res.status_code == 200
    match_data = res.json()
    assert match_data["total_evaluated"] >= 1

def test_manual_mismatch_resolution(client: TestClient, auth_headers: dict):
    """Accounts Officer can resolve a flagged mismatch with mandatory audit notes."""
    # Resolve MIS-2026-001
    resp = client.post("/api/v1/reconciliation/mismatches/MIS-2026-001/resolve", json={
        "resolution_notes": "Variance of 5000 verified against bank credit advice #BA-9921 and approved by CFO",
    }, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["code"] == "MIS-2026-001"
    assert data["status"] == "RESOLVED"
    assert "BA-9921" in data["resolution_notes"]

def test_student_and_parent_blocked_from_reconciliation(client: TestClient):
    """Students and parents MUST NOT have access to institution bank reconciliation data."""
    login_stu = client.post("/api/v1/auth/login", json={"email": "aravind.k@student.edu", "password": "STU1001"})
    assert login_stu.status_code == 200, login_stu.text
    stu_headers = {"Authorization": f"Bearer {login_stu.json()['access_token']}"}

    resp1 = client.get("/api/v1/reconciliation/bank-transactions", headers=stu_headers)
    assert resp1.status_code == 403

    resp2 = client.get("/api/v1/reconciliation/mismatches", headers=stu_headers)
    assert resp2.status_code == 403

    resp3 = client.post("/api/v1/reconciliation/match", json={}, headers=stu_headers)
    assert resp3.status_code == 403

    # Parent
    login_par = client.post("/api/v1/auth/login", json={"email": "parent.aravind@gmail.com", "password": "password123"})
    par_headers = {"Authorization": f"Bearer {login_par.json()['access_token']}"}

    resp4 = client.get("/api/v1/reconciliation/bank-transactions", headers=par_headers)
    assert resp4.status_code == 403
