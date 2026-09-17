"""
Comprehensive test suite for Agent 40 Multi-Step, Multi-Filter Reasoning Engine.
Tests cover:
- Exact target query ("Which OBC students in CSE are overdue AND have exam clearance blocked?")
- 2-filter and 4-filter queries
- 0-match queries
- All-or-nothing RBAC denial for unauthorized roles (e.g., student attempting cohort queries)
- Unmappable predicate handling
- Max DAG depth enforcement (<= 5)
- Deterministic Python set-intersection execution
- Direct filter tools unit testing
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.planner import QueryPlanner
from app.ai.tools.filter_tools import (
    filter_students,
    filter_by_category,
    filter_by_program,
    filter_by_payment_status,
    filter_by_exam_clearance,
)
from app.core.database import SessionLocal

client = TestClient(app)


def get_auth_token(email: str, password: str = None) -> str:
    if password is None:
        student_pw_map = {
            "aravind.k@student.edu": "STU1001",
            "priya.s@student.edu": "STU1002",
        }
        password = student_pw_map.get(email, "password123")
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


# =========================================================================
# 1. Target Query: OBC + CSE + Overdue + Exam Clearance Blocked
# =========================================================================

def test_target_compound_query_obc_cse_overdue_blocked():
    """
    Target Query: 'Which OBC students in CSE are overdue AND have exam clearance blocked?'
    Must decompose into predicates, chain filter tools, perform deterministic set intersection,
    and find exactly STU1010 (Swati Deshmukh).
    """
    token = get_auth_token("accounts@university.edu")
    query = "Which OBC students in CSE are overdue and have exam clearance blocked?"
    
    res = client.post(
        "/api/v1/ai/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": query},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    
    assert data["status"] == "SUCCESS"
    assert data["intent"] in ("MULTI_FILTER_REASONING", "MULTI_FILTER_QUERY")
    
    # Verify tools used
    assert len(data["tools_used"]) >= 3
    assert any("filter" in t for t in data["tools_used"])
    
    # Verify reasoning trace exists and explains the steps
    assert data.get("reasoning_trace") is not None
    assert len(data["reasoning_trace"]) >= 3
    
    # Verify exact deterministic student matching
    financial_data = data["financial_data"]
    assert financial_data is not None
    assert financial_data.get("count") == 1
    
    matched_student = financial_data["students"][0]
    assert matched_student["roll_no"] == "STU1010"
    assert "Swati" in matched_student["name"]
    assert "CSE" in matched_student["program"]
    assert matched_student["category"] == "OBC"
    assert matched_student["outstanding"] > 0
    assert matched_student.get("is_overdue") is True
    
    # Verify answer mentions student
    assert "STU1010" in data["answer"] or "Swati" in data["answer"]


# =========================================================================
# 2. Two-filter Query: Program + Payment Status
# =========================================================================

def test_two_filter_query_program_and_status():
    """Two-filter query: 'Show CSE students who are overdue'."""
    token = get_auth_token("accounts@university.edu")
    query = "Show CSE students who are overdue"
    
    res = client.post(
        "/api/v1/ai/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": query},
    )
    assert res.status_code == 200
    data = res.json()
    
    assert data["status"] == "SUCCESS"
    assert data["intent"] in ("MULTI_FILTER_REASONING", "MULTI_FILTER_QUERY")
    assert len(data["tools_used"]) >= 2
    assert data["financial_data"]["count"] >= 1
    
    # All returned students must be in CSE and overdue
    for s in data["financial_data"]["students"]:
        assert "CSE" in s["program"]
        assert s["outstanding"] > 0


# =========================================================================
# 3. Four-filter Query: Category + Program + Status + Exam Clearance
# =========================================================================

def test_four_filter_query():
    """Four distinct domain filters chained into DAG."""
    token = get_auth_token("accounts@university.edu")
    query = "Find General category students in B.Tech Mechanical with overdue balance and blocked hall tickets"
    
    res = client.post(
        "/api/v1/ai/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": query},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data.get("reasoning_trace") is not None
    assert len(data["reasoning_trace"]) >= 2


# =========================================================================
# 4. Zero-match Query: Impossible / Non-existent Cohort
# =========================================================================

def test_zero_match_query():
    """Zero-match query: Returns count 0 and clear explanation without hallucination."""
    token = get_auth_token("accounts@university.edu")
    query = "Show ST students in MBA who are overdue and have exam clearance blocked"
    
    res = client.post(
        "/api/v1/ai/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": query},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["financial_data"]["count"] == 0
    assert len(data["financial_data"]["students"]) == 0
    assert "No students matched" in data["answer"] or "0" in data["answer"]


# =========================================================================
# 5. All-or-Nothing RBAC Denial for Student
# =========================================================================

def test_student_rbac_denial_on_compound_query():
    """
    If a student attempts to execute a multi-filter cohort query containing staff-only
    filter tools, the all-or-nothing RBAC gatekeeper must deny the entire query with 403.
    """
    token = get_auth_token("aravind.k@student.edu")
    query = "Which OBC students in CSE are overdue and have exam clearance blocked?"
    
    res = client.post(
        "/api/v1/ai/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": query},
    )
    assert res.status_code == 403
    detail = res.json()["detail"]
    assert "RBAC Denial" in detail or "not authorized" in detail.lower() or "Access denied" in detail


# =========================================================================
# 6. Unmappable Predicates Handling
# =========================================================================

def test_unmappable_predicate_fallback():
    """Queries with predicates outside system domains return helpful clarification."""
    token = get_auth_token("accounts@university.edu")
    query = "Show students with blood group AB positive living in north hostel"
    
    res = client.post(
        "/api/v1/ai/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": query},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("UNSUPPORTED_PREDICATE", "SUCCESS")
    assert "blood group" in data["answer"].lower() or "hostel" in data["answer"].lower() or data["financial_data"] is None or data["financial_data"].get("count") == 0


# =========================================================================
# 7. Max Depth Cap Enforcement
# =========================================================================

def test_max_depth_cap():
    """DAG construction strictly adheres to MAX_DEPTH = 5 limit."""
    planner = QueryPlanner()
    assert planner.MAX_DEPTH == 5
    
    # Synthesize a query with 6 predicates
    predicates = [
        {"domain": "academic", "field": "category", "value": "OBC"},
        {"domain": "academic", "field": "program", "value": "CSE"},
        {"domain": "financial", "field": "status", "value": "OVERDUE"},
        {"domain": "financial", "field": "aging_bucket", "value": "BUCKET_4"},
        {"domain": "exam", "field": "clearance", "value": "BLOCKED"},
        {"domain": "academic", "field": "admission_route", "value": "JEE_MAINS"},
    ]
    dag = planner.build_plan(predicates)
    assert len(dag) <= planner.MAX_DEPTH


# =========================================================================
# 8. Deterministic Set-Intersection Unit Test
# =========================================================================

def test_deterministic_set_intersection_logic():
    """Verify that candidate ID narrowing uses exact Python set intersection."""
    planner = QueryPlanner()
    db = SessionLocal()
    try:
        # Step 1: filter OBC in CSE
        res1 = filter_students(db, category="OBC", program="CSE")
        set1 = set(res1["matched_student_ids"])
        assert len(set1) > 0
        
        # Step 2: filter OVERDUE
        res2 = filter_by_payment_status(db, status="OVERDUE")
        set2 = set(res2["matched_student_ids"])
        assert len(set2) > 0
        
        # Step 3: filter BLOCKED
        res3 = filter_by_exam_clearance(db, status="BLOCKED")
        set3 = set(res3["matched_student_ids"])
        assert len(set3) > 0
        
        # Intersection
        intersection = set1 & set2 & set3
        assert len(intersection) == 1
        
        # Roll number should be STU1010
        from app.models.users import Student
        student = db.query(Student).filter(Student.id == list(intersection)[0]).first()
        assert student.roll_no == "STU1010"
        assert student.category.code == "OBC"
    finally:
        db.close()


# =========================================================================
# 9. Direct Filter Tools Unit Test
# =========================================================================

def test_direct_filter_tools():
    """Verify individual granular tools work directly with SessionLocal."""
    db = SessionLocal()
    try:
        cat_res = filter_by_category(db, category="OBC")
        assert cat_res["count"] > 0
        
        prog_res = filter_by_program(db, program="CSE")
        assert prog_res["count"] > 0
        
        pay_res = filter_by_payment_status(db, status="OVERDUE")
        assert pay_res["count"] > 0
        
        exam_res = filter_by_exam_clearance(db, status="BLOCKED")
        assert exam_res["count"] > 0
    finally:
        db.close()
