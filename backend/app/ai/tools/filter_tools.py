"""
Deterministic Filtering & Chaining Tools for Agent 40.
Provides granular multi-domain filters for:
- Academic cohort & student attributes (program, category, route, CGPA, attendance)
- Financial ledger status (payment status, aging bucket, outstanding balance, scholarships, waivers)
- Examination clearance & hall ticket gating

All filter tools support input `student_ids` for pipeline chaining (set intersection)
and return a standardized FilterResult envelope:
{
    "matched_ids": List[str],
    "count": int,
    "sample": List[Dict[str, Any]],
    "filter_applied": Dict[str, Any]
}
"""
from typing import List, Dict, Any, Optional
from datetime import date
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.users import User, Student
from app.models.academics import Program, Category, AdmissionRoute
from app.models.fee_demands import FeeDemand, FeeDemandItem, Scholarship, Concession, FeeWaiver
from app.models.approvals import ApprovalRequest
from app.models.enums import FeeDemandStatus, UserRole, ApprovalStatus, ApprovalType
from app.services.ledger_calculator import calculate_student_financials, to_decimal
from app.services.clearance_service import ClearanceService

# Standardized Enums for Type Safety
class PaymentStatusFilter(str, Enum):
    PENDING = "PENDING"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    OVERDUE = "OVERDUE"
    PAID = "PAID"

class AgingBucketFilter(str, Enum):
    CURRENT = "CURRENT"
    BUCKET_1 = "BUCKET_1"       # 1-30 days
    BUCKET_2 = "BUCKET_2"       # 31-60 days
    BUCKET_3 = "BUCKET_3"       # 61-90 days
    BUCKET_4 = "BUCKET_4"       # 90+ days

class ExamClearanceFilter(str, Enum):
    CLEARED = "CLEARED"
    BLOCKED = "BLOCKED"
    CONDITIONAL_HOLD = "CONDITIONAL_HOLD"

# Pydantic Schemas
class FilterResult(BaseModel):
    matched_ids: List[str] = Field(default_factory=list, description="List of matched student UUIDs")
    matched_student_ids: List[str] = Field(default_factory=list, description="Alias for matched student UUIDs")
    count: int = Field(0, description="Total count of matched students")
    sample: List[Dict[str, Any]] = Field(default_factory=list, description="Detailed sample records (up to 10)")
    filter_applied: Dict[str, Any] = Field(default_factory=dict, description="Metadata of filter criteria")


def _filter_by_base_scope(db: Session, student_ids: Optional[List[str]] = None):
    query = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.program),
        joinedload(Student.category),
        joinedload(Student.admission_route),
        joinedload(Student.fee_demands).joinedload(FeeDemand.items),
        joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
        joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
        joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
    )
    if student_ids is not None:
        clean_ids = [str(sid).strip() for sid in student_ids if str(sid).strip()]
        query = query.filter((Student.id.in_(clean_ids)) | (Student.roll_no.in_([s.upper() for s in clean_ids])))
    return query

def _build_student_summary(student: Student) -> Dict[str, Any]:
    demand = student.fee_demands[0] if student.fee_demands else None
    payments = demand.payments if (demand and demand.payments) else []
    calc = calculate_student_financials(demand, payments, date.today())
    return {
        "id": student.id,
        "roll_no": student.roll_no,
        "name": student.user.full_name if student.user else "N/A",
        "email": student.user.email if student.user else "N/A",
        "program": student.program.code if student.program else "N/A",
        "category": student.category.code if student.category else "N/A",
        "net_demand": float(calc["net_demand"]),
        "paid_amount": float(calc["paid_amount"]),
        "outstanding": float(calc["outstanding_amount"]),
        "status": calc["status"],
        "is_overdue": calc["is_overdue"],
        "cgpa": float(student.cgpa) if student.cgpa else None,
        "attendance": float(student.attendance_percentage) if student.attendance_percentage else None,
    }

# =========================================================================
# 1. ACADEMIC DOMAIN TOOLS
# =========================================================================

def filter_students(
    db: Session,
    current_user: Optional[User] = None,
    program_code: Optional[str] = None,
    category_code: Optional[str] = None,
    admission_route_code: Optional[str] = None,
    semester: Optional[int] = None,
    cgpa_min: Optional[float] = None,
    cgpa_max: Optional[float] = None,
    attendance_min: Optional[float] = None,
    attendance_max: Optional[float] = None,
    student_ids: Optional[List[str]] = None,
    category: Optional[str] = None,
    program: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Authoritative filter: Filters students matching all supplied academic attributes (AND logic).
    Supports student_ids input for chaining.
    """
    cat = category_code or category
    prog = program_code or program
    query = _filter_by_base_scope(db, student_ids)

    if prog:
        query = query.join(Student.program).filter(Program.code.ilike(f"%{prog.strip()}%"))
    if cat:
        query = query.join(Student.category).filter(Category.code.ilike(f"%{cat.strip()}%"))
    if admission_route_code:
        query = query.join(Student.admission_route).filter(AdmissionRoute.code.ilike(f"%{admission_route_code.strip()}%"))
    if semester is not None:
        query = query.filter(Student.current_semester == int(semester))
    if cgpa_min is not None:
        query = query.filter(Student.cgpa >= float(cgpa_min))
    if cgpa_max is not None:
        query = query.filter(Student.cgpa <= float(cgpa_max))
    if attendance_min is not None:
        query = query.filter(Student.attendance_percentage >= float(attendance_min))
    if attendance_max is not None:
        query = query.filter(Student.attendance_percentage <= float(attendance_max))

    matched_students = query.all()
    matched_ids = [s.id for s in matched_students]
    sample = [_build_student_summary(s) for s in matched_students[:10]]

    return FilterResult(
        matched_ids=matched_ids,
        matched_student_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={
            "program_code": prog,
            "category_code": cat,
            "admission_route_code": admission_route_code,
            "semester": semester,
            "cgpa_min": cgpa_min,
            "cgpa_max": cgpa_max,
            "attendance_min": attendance_min,
            "attendance_max": attendance_max,
        }
    ).model_dump()

def filter_by_program(
    db: Session,
    current_user: Optional[User] = None,
    program_code: Optional[str] = None,
    program: Optional[str] = None,
    student_ids: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """Filters students by academic degree program code (e.g. BTECH-CSE, BTECH-ECE, MBA)."""
    prog = program_code or program or ""
    return filter_students(db=db, current_user=current_user, program_code=prog, student_ids=student_ids)

def filter_by_category(
    db: Session,
    current_user: Optional[User] = None,
    category_code: Optional[str] = None,
    category: Optional[str] = None,
    student_ids: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """Filters students by social/admission reservation category (e.g. OBC, SC, ST, GEN, EWS)."""
    cat = category_code or category or ""
    return filter_students(db=db, current_user=current_user, category_code=cat, student_ids=student_ids)


def filter_by_admission_route(
    db: Session,
    current_user: User,
    route_code: str,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Filters students by quota admission route (e.g. JEE_MAINS, VSAT, MANAGEMENT)."""
    return filter_students(db=db, current_user=current_user, admission_route_code=route_code, student_ids=student_ids)

def filter_by_attendance_shortage(
    db: Session,
    current_user: User,
    threshold: float = 75.0,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Filters students with attendance below threshold (default 75% statutory requirement)."""
    return filter_students(db=db, current_user=current_user, attendance_max=threshold, student_ids=student_ids)

def filter_by_cgpa_range(
    db: Session,
    current_user: User,
    min_cgpa: Optional[float] = None,
    max_cgpa: Optional[float] = None,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Filters students within a CGPA range."""
    return filter_students(db=db, current_user=current_user, cgpa_min=min_cgpa, cgpa_max=max_cgpa, student_ids=student_ids)

def get_student_profile(
    db: Session,
    current_user: User,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None
) -> Dict[str, Any]:
    """Fetches full academic, admission, category, CGPA and attendance profile for a student."""
    query = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.program),
        joinedload(Student.category),
        joinedload(Student.admission_route),
    )
    if roll_no:
        student = query.filter(Student.roll_no.ilike(roll_no.strip())).first()
    elif student_id:
        student = query.filter(Student.id == student_id).first()
    elif current_user.role == UserRole.STUDENT and current_user.student_profile:
        student = query.filter(Student.id == current_user.student_profile.id).first()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student identifier required.")

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found.")

    return {
        "id": student.id,
        "roll_no": student.roll_no,
        "name": student.user.full_name if student.user else "N/A",
        "email": student.user.email if student.user else "N/A",
        "program": student.program.name if student.program else "N/A",
        "category": student.category.code if student.category else "N/A",
        "admission_route": student.admission_route.name if student.admission_route else "N/A",
        "semester": student.current_semester,
        "cgpa": float(student.cgpa) if student.cgpa else None,
        "attendance": float(student.attendance_percentage) if student.attendance_percentage else None,
    }

# =========================================================================
# 2. FINANCIAL STATUS & LEDGER FILTERING TOOLS
# =========================================================================

def filter_by_payment_status(
    db: Session,
    current_user: Optional[User] = None,
    status: str = "OVERDUE",
    student_ids: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Authoritative filter: Filters students strictly by derived payment status:
    OVERDUE, PARTIALLY_PAID, PENDING, or PAID.
    """
    target_status = status.upper().strip()
    query = _filter_by_base_scope(db, student_ids)
    all_students = query.all()

    matched_ids = []
    sample = []

    today = date.today()
    for s in all_students:
        demand = s.fee_demands[0] if s.fee_demands else None
        payments = demand.payments if (demand and demand.payments) else []
        calc = calculate_student_financials(demand, payments, today)

        if calc["status"] == target_status or (target_status == "OVERDUE" and calc["is_overdue"]):
            matched_ids.append(s.id)
            if len(sample) < 10:
                sample.append(_build_student_summary(s))

    return FilterResult(
        matched_ids=matched_ids,
        matched_student_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={"status": target_status}
    ).model_dump()

def filter_by_aging_bucket(
    db: Session,
    current_user: User,
    bucket: str,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Authoritative filter: Filters students by overdue aging bucket:
    - BUCKET_1: 1-30 days overdue
    - BUCKET_2: 31-60 days overdue
    - BUCKET_3: 61-90 days overdue
    - BUCKET_4: 90+ days overdue
    - CURRENT: Not overdue
    """
    target_bucket = bucket.upper().strip()
    query = _filter_by_base_scope(db, student_ids)
    all_students = query.all()

    today = date.today()
    matched_ids = []
    sample = []

    for s in all_students:
        demand = s.fee_demands[0] if s.fee_demands else None
        payments = demand.payments if (demand and demand.payments) else []
        calc = calculate_student_financials(demand, payments, today)

        out_amt = calc["outstanding_amount"]
        due_date = calc["due_date"]
        is_overdue = calc["is_overdue"]

        assigned_bucket = "CURRENT"
        if is_overdue and due_date and out_amt > Decimal("0.00"):
            days_overdue = (today - due_date).days
            if 1 <= days_overdue <= 30:
                assigned_bucket = "BUCKET_1"
            elif 31 <= days_overdue <= 60:
                assigned_bucket = "BUCKET_2"
            elif 61 <= days_overdue <= 90:
                assigned_bucket = "BUCKET_3"
            elif days_overdue > 90:
                assigned_bucket = "BUCKET_4"

        if assigned_bucket == target_bucket:
            matched_ids.append(s.id)
            if len(sample) < 10:
                sample.append(_build_student_summary(s))

    return FilterResult(
        matched_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={"aging_bucket": target_bucket}
    ).model_dump()

def filter_by_outstanding_range(
    db: Session,
    current_user: User,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Filters students with outstanding balance in [min_amount, max_amount]."""
    query = _filter_by_base_scope(db, student_ids)
    all_students = query.all()

    matched_ids = []
    sample = []
    today = date.today()
    min_dec = to_decimal(min_amount) if min_amount is not None else None
    max_dec = to_decimal(max_amount) if max_amount is not None else None

    for s in all_students:
        demand = s.fee_demands[0] if s.fee_demands else None
        payments = demand.payments if (demand and demand.payments) else []
        calc = calculate_student_financials(demand, payments, today)
        out_amt = calc["outstanding_amount"]

        if min_dec is not None and out_amt < min_dec:
            continue
        if max_dec is not None and out_amt > max_dec:
            continue

        matched_ids.append(s.id)
        if len(sample) < 10:
            sample.append(_build_student_summary(s))

    return FilterResult(
        matched_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={"min_amount": min_amount, "max_amount": max_amount}
    ).model_dump()

def filter_by_scholarship_recipient(
    db: Session,
    current_user: User,
    scholarship_code: Optional[str] = None,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Filters students who have received scholarships."""
    query = _filter_by_base_scope(db, student_ids)
    all_students = query.all()

    matched_ids = []
    sample = []
    for s in all_students:
        demand = s.fee_demands[0] if s.fee_demands else None
        if not demand or not demand.scholarships:
            continue
        valid_schs = [
            sch for sch in demand.scholarships
            if (scholarship_code is None or scholarship_code.upper() in (sch.code or "").upper() or scholarship_code.upper() in (sch.name or "").upper())
        ]
        if valid_schs:
            matched_ids.append(s.id)
            if len(sample) < 10:
                sample.append(_build_student_summary(s))

    return FilterResult(
        matched_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={"scholarship_code": scholarship_code}
    ).model_dump()

def filter_by_concession(
    db: Session,
    current_user: User,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Filters students who have received fee concessions."""
    query = _filter_by_base_scope(db, student_ids)
    all_students = query.all()

    matched_ids = []
    sample = []
    for s in all_students:
        demand = s.fee_demands[0] if s.fee_demands else None
        if demand and demand.concessions and len(demand.concessions) > 0:
            matched_ids.append(s.id)
            if len(sample) < 10:
                sample.append(_build_student_summary(s))

    return FilterResult(
        matched_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={"has_concession": True}
    ).model_dump()

def filter_by_waiver(
    db: Session,
    current_user: User,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Filters students who have received approved fee waivers."""
    query = _filter_by_base_scope(db, student_ids)
    all_students = query.all()

    matched_ids = []
    sample = []
    for s in all_students:
        demand = s.fee_demands[0] if s.fee_demands else None
        if demand and demand.waivers and len(demand.waivers) > 0:
            matched_ids.append(s.id)
            if len(sample) < 10:
                sample.append(_build_student_summary(s))

    return FilterResult(
        matched_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={"has_waiver": True}
    ).model_dump()

def filter_by_installment_plan(
    db: Session,
    current_user: User,
    student_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Filters students actively registered in installment split plans."""
    query = _filter_by_base_scope(db, student_ids)
    all_students = query.all()

    matched_ids = []
    sample = []
    for s in all_students:
        demand = s.fee_demands[0] if s.fee_demands else None
        if demand and getattr(demand, "installment_plan", None):
            matched_ids.append(s.id)
            if len(sample) < 10:
                sample.append(_build_student_summary(s))

    return FilterResult(
        matched_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={"has_installment_plan": True}
    ).model_dump()

# =========================================================================
# 3. EXAM & GATE CLEARANCE FILTERING TOOLS
# =========================================================================

def filter_by_exam_clearance(
    db: Session,
    current_user: Optional[User] = None,
    status: str = "BLOCKED",
    student_ids: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Authoritative filter: Filters students by Exam Hall Ticket Clearance status:
    - CLEARED: Eligible for hall ticket (dues clear or active override)
    - BLOCKED: Ineligible for hall ticket due to overdue dues or financial holds
    - CONDITIONAL_HOLD: Held for review (e.g. attendance shortage or pending permission)
    """
    target = status.upper().strip()
    query = _filter_by_base_scope(db, student_ids)
    all_students = query.all()

    matched_ids = []
    sample = []
    today = date.today()

    for s in all_students:
        eval_resp = ClearanceService.evaluate_clearance(db, s.id, today)
        is_cleared = eval_resp.is_eligible_for_hall_ticket
        eval_status = eval_resp.clearance_status

        # Check special permissions (e.g., Meera Iyer attendance shortage)
        has_cond_perm = eval_resp.special_permission is not None and eval_resp.special_permission.get("status") in ("PENDING", "APPROVED")

        matched = False
        if target in ("CLEARED", "FULL_CLEARANCE"):
            matched = is_cleared and not has_cond_perm and eval_status in ("FULL_CLEARANCE", "CONDITIONAL_CLEARANCE")
        elif target in ("BLOCKED", "BLOCKED_WITH_HOLDS"):
            matched = not is_cleared
        elif target in ("CONDITIONAL_HOLD", "CONDITIONAL_CLEARANCE"):
            matched = has_cond_perm or eval_status == "CONDITIONAL_CLEARANCE" or (s.attendance_percentage and s.attendance_percentage < 75.0)

        if matched:
            matched_ids.append(s.id)
            if len(sample) < 10:
                item = _build_student_summary(s)
                item["clearance_status"] = eval_status
                item["hall_ticket_eligible"] = is_cleared
                sample.append(item)

    return FilterResult(
        matched_ids=matched_ids,
        matched_student_ids=matched_ids,
        count=len(matched_ids),
        sample=sample,
        filter_applied={"clearance_status": target}
    ).model_dump()


def check_exam_clearance(
    db: Session,
    current_user: User,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative tool: Detailed check of a single student's examination clearance,
    unpaid fee heads, attendance status, and counselor permission requests.
    """
    from app.ai.tools.student_fee_tools import _resolve_authorized_student
    student = _resolve_authorized_student(db, current_user, student_id, roll_no)
    eval_resp = ClearanceService.evaluate_clearance(db, student.id, date.today())
    return eval_resp.model_dump()
