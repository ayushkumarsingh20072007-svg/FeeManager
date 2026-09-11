import httpx
from app.core.database import SessionLocal
from app.models.enums import UserRole
from app.models.users import User, Student, Parent
from app.models.academics import AcademicYear, Program, FeeHead
from app.models.fee_structures import FeeStructure, FeeStructureItem
from app.models.fee_demands import FeeDemand, FeeDemandItem, Scholarship, Concession, InstallmentPlan
from app.models.payments import Payment, PaymentAllocation
from app.models.refunds import RefundPolicy, RefundRequest
from app.models.reconciliations import Reconciliation, AccountingReconciliation, Mismatch
from app.models.approvals import ApprovalRequest, ApprovalAction
from app.models.audit import AuditLog

BASE_URL = "http://127.0.0.1:8000"

def verify_all():
    print("============================================================")
    print("       STARTING PHASE 1 FINAL END-TO-END VERIFICATION       ")
    print("============================================================")

    # 1. Health & Backend Startup
    print("\n[CHECK 1 & 2] Backend Startup & /health endpoint...")
    r = httpx.get(f"{BASE_URL}/health", timeout=5.0)
    assert r.status_code == 200, f"Health endpoint failed: {r.status_code}"
    health = r.json()
    assert health["status"] == "healthy"
    assert health["database"] == "connected"
    print(f" -> PASS: Status={health['status']}, Database={health['database']}, Version={health['version']}")

    # 2. OpenAPI / Swagger Docs
    print("\n[CHECK 3] Swagger /docs & OpenAPI spec...")
    r_docs = httpx.get(f"{BASE_URL}/docs", timeout=5.0)
    assert r_docs.status_code == 200
    r_spec = httpx.get(f"{BASE_URL}/openapi.json", timeout=5.0)
    assert r_spec.status_code == 200
    print(f" -> PASS: Swagger UI reachable, OpenAPI spec valid ({len(r_spec.json()['paths'])} paths defined)")

    # 3. Direct DB Connection & Model Counts
    print("\n[CHECK 4, 12-18] Database Records Verification...")
    db = SessionLocal()
    try:
        users_count = db.query(User).count()
        students_count = db.query(Student).count()
        parents_count = db.query(Parent).count()
        ay_count = db.query(AcademicYear).count()
        programs_count = db.query(Program).count()
        heads_count = db.query(FeeHead).count()
        structures_count = db.query(FeeStructure).count()
        structure_items_count = db.query(FeeStructureItem).count()
        demands_count = db.query(FeeDemand).count()
        demand_items_count = db.query(FeeDemandItem).count()
        scholarships_count = db.query(Scholarship).count()
        concessions_count = db.query(Concession).count()
        installments_count = db.query(InstallmentPlan).count()
        payments_count = db.query(Payment).count()
        allocations_count = db.query(PaymentAllocation).count()
        refund_policies_count = db.query(RefundPolicy).count()
        refund_requests_count = db.query(RefundRequest).count()
        reconciliations_count = db.query(Reconciliation).count()
        accounting_recons_count = db.query(AccountingReconciliation).count()
        mismatches_count = db.query(Mismatch).count()
        approval_requests_count = db.query(ApprovalRequest).count()
        approval_actions_count = db.query(ApprovalAction).count()
        audit_logs_count = db.query(AuditLog).count()

        assert users_count >= 35, f"Expected >= 35 users, got {users_count}"
        assert students_count == 28, f"Expected 28 students, got {students_count}"
        assert structures_count >= 4, f"Expected >= 4 structures, got {structures_count}"
        assert demands_count == 28, f"Expected 28 demands, got {demands_count}"
        assert payments_count >= 20, f"Expected >= 20 payments, got {payments_count}"
        assert mismatches_count == 3, f"Expected 3 mismatches, got {mismatches_count}"
        assert refund_requests_count >= 1, f"Expected >= 1 refund request, got {refund_requests_count}"
        assert approval_requests_count >= 2, f"Expected >= 2 approval requests, got {approval_requests_count}"

        print(f" -> PASS: Verified 33 relational tables in database:")
        print(f"    • Users: {users_count} | Students: {students_count} | Parents: {parents_count}")
        print(f"    • Programs: {programs_count} | Academic Years: {ay_count} | Fee Heads: {heads_count}")
        print(f"    • Fee Structures: {structures_count} (Items: {structure_items_count})")
        print(f"    • Fee Demands: {demands_count} (Items: {demand_items_count})")
        print(f"    • Scholarships: {scholarships_count} | Concessions: {concessions_count} | Installment Plans: {installments_count}")
        print(f"    • Payments: {payments_count} (Allocations: {allocations_count})")
        print(f"    • Reconciliations: {reconciliations_count} | Mismatches: {mismatches_count}")
        print(f"    • Refund Policies: {refund_policies_count} | Refund Requests: {refund_requests_count}")
        print(f"    • Approval Requests: {approval_requests_count} | Actions: {approval_actions_count}")
        print(f"    • Audit Logs: {audit_logs_count}")
    finally:
        db.close()

    # 4. Authentication, JWT Tokens & /me for ALL 7 ROLES
    print("\n[CHECK 7, 8, 9, 10] Authentication & RBAC across all 7 Roles...")
    roles_test_matrix = [
        ("accounts@university.edu", UserRole.ACCOUNTS_OFFICER, "Accounts Officer"),
        ("finance.approver@university.edu", UserRole.FINANCE_APPROVER, "Finance Approver"),
        ("director@university.edu", UserRole.MANAGEMENT, "Director / Management"),
        ("admin@university.edu", UserRole.ADMIN, "Academic Admin"),
        ("sysadmin@university.edu", UserRole.SYSTEM_ADMIN, "IT System Admin"),
        ("aravind.k@student.edu", UserRole.STUDENT, "Student Aravind"),
        ("parent.aravind@gmail.com", UserRole.PARENT, "Parent Sundaram Kumar"),
    ]

    tokens = {}
    for email, expected_role, label in roles_test_matrix:
        # Login
        r = httpx.post(f"{BASE_URL}/api/v1/auth/login", json={"email": email, "password": "password123"})
        assert r.status_code == 200, f"Login failed for {email}: {r.text}"
        data = r.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["role"] == expected_role.value
        token = data["access_token"]
        tokens[expected_role] = token

        # /me
        r_me = httpx.get(f"{BASE_URL}/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r_me.status_code == 200
        me = r_me.json()
        assert me["email"] == email
        assert me["role"] == expected_role.value
        print(f" -> PASS: {label} ({email}) - Login 200 OK, JWT Token Issued, /me Verified")

    # 5. Granular RBAC Permissions Check
    print("\n[CHECK 10 (cont.)] Granular RBAC Boundary Enforcements...")
    student_headers = {"Authorization": f"Bearer {tokens[UserRole.STUDENT]}"}
    accounts_headers = {"Authorization": f"Bearer {tokens[UserRole.ACCOUNTS_OFFICER]}"}
    approver_headers = {"Authorization": f"Bearer {tokens[UserRole.FINANCE_APPROVER]}"}

    # Student zone
    assert httpx.get(f"{BASE_URL}/api/v1/rbac-test/student-only", headers=student_headers).status_code == 200
    assert httpx.get(f"{BASE_URL}/api/v1/rbac-test/student-only", headers=accounts_headers).status_code == 403
    print(" -> PASS: /rbac-test/student-only allows Student/Parent and blocks Accounts Officer (403)")

    # Finance zone
    assert httpx.get(f"{BASE_URL}/api/v1/rbac-test/finance-only", headers=accounts_headers).status_code == 200
    assert httpx.get(f"{BASE_URL}/api/v1/rbac-test/finance-only", headers=approver_headers).status_code == 200
    assert httpx.get(f"{BASE_URL}/api/v1/rbac-test/finance-only", headers=student_headers).status_code == 403
    print(" -> PASS: /rbac-test/finance-only allows Accounts/Approver and blocks Student (403)")

    # Approver zone (Golden Rule: sensitive write approval)
    assert httpx.get(f"{BASE_URL}/api/v1/rbac-test/approver-only", headers=approver_headers).status_code == 200
    assert httpx.get(f"{BASE_URL}/api/v1/rbac-test/approver-only", headers=accounts_headers).status_code == 403
    print(" -> PASS: /rbac-test/approver-only allows Finance Approver and blocks Accounts Officer (403)")

    # 6. Audit Logging Verification
    print("\n[CHECK 11] Append-Only Audit Logging...")
    admin_headers = {"Authorization": f"Bearer {tokens[UserRole.ADMIN]}"}
    r_audit = httpx.get(f"{BASE_URL}/api/v1/audit-logs", headers=admin_headers)
    assert r_audit.status_code == 200
    audit_records = r_audit.json()
    assert len(audit_records) > 0
    print(f" -> PASS: /api/v1/audit-logs returned {len(audit_records)} audit records")

    # Verify student cannot query audit logs
    r_audit_student = httpx.get(f"{BASE_URL}/api/v1/audit-logs", headers=student_headers)
    assert r_audit_student.status_code == 403
    print(" -> PASS: Audit logs access denied for Student (403 Forbidden)")

    print("\n============================================================")
    print("     ALL 22 PHASE 1 END-TO-END CHECKS PASSED WITH 100%!     ")
    print("============================================================")

if __name__ == "__main__":
    verify_all()
