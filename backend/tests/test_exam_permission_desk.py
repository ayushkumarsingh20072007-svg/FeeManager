import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.users import Student, User
from app.models.approvals import ApprovalRequest
from app.models.enums import ApprovalType, ApprovalStatus

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

def test_exam_permission_workflow():
    db = SessionLocal()
    # Find student with overdue dues (Priya Sharma STU1002)
    student = db.query(Student).filter(Student.roll_no == "STU1002").first()
    student_user = db.query(User).filter(User.id == student.user_id).first()
    db.close()

    assert student is not None
    assert student_user is not None

    student_token = get_auth_token(student_user.email)
    admin_token = get_auth_token("admin@university.edu")

    # 1. Check initial clearance
    res = client.get(
        f"/api/v1/integrations/clearance/{student.roll_no}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res.status_code == 200
    init_data = res.json()
    assert "clearance_status" in init_data

    # 2. Submit Exam Permission Request
    perm_payload = {
        "reason_category": "EDUCATION_LOAN",
        "commitment_date": "2026-06-15",
        "reason": "Education loan sanctioned by SBI Main Branch; disbursement expected next week.",
        "student_roll": student.roll_no
    }
    req_res = client.post(
        "/api/v1/integrations/exam-permission/request",
        json=perm_payload,
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["status"] == "PENDING"
    assert req_data["reason_category"] == "EDUCATION_LOAN"
    req_id = req_data["id"]

    # 3. Staff retrieves list of exam permission requests
    list_res = client.get(
        "/api/v1/integrations/exam-permissions",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_res.status_code == 200
    requests_list = list_res.json()
    assert any(r["id"] == req_id for r in requests_list)

    # 4. Staff approves the permission request
    review_payload = {
        "action": "APPROVED",
        "comments": "SBI loan sanction letter verified. Granted permission for Semester Examinations.",
        "valid_until": "2026-06-30"
    }
    review_res = client.post(
        f"/api/v1/integrations/exam-permissions/{req_id}/review",
        json=review_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["status"] == "APPROVED"
    assert review_data["valid_until"] == "2026-06-30"

    # 5. Verify Student Clearance is now SPECIAL_ENTRY_PERMITTED & Hall Ticket is UNLOCKED
    after_res = client.get(
        f"/api/v1/integrations/clearance/{student.roll_no}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert after_res.status_code == 200
    after_data = after_res.json()
    assert after_data["clearance_status"] == "SPECIAL_ENTRY_PERMITTED"
    assert after_data["is_eligible_for_hall_ticket"] is True
    assert after_data["special_permission"] is not None
    assert after_data["special_permission"]["status"] == "APPROVED"

    # 6. Verify Exam Timetable endpoint returns courses
    tt_res = client.get(
        f"/api/v1/integrations/exam-timetable/{student.roll_no}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert tt_res.status_code == 200
    tt_data = tt_res.json()
    assert tt_data["is_eligible"] is True
    assert len(tt_data["courses"]) >= 3

    # Clean up test approval request so Priya remains in clean fresh demo state
    db = SessionLocal()
    req = db.query(ApprovalRequest).filter(ApprovalRequest.id == req_id).first()
    if req:
        for a in req.actions:
            db.delete(a)
        db.delete(req)
        db.commit()
    db.close()
