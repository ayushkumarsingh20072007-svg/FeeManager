import json
import random
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.users import User, Student
from app.models.approvals import ApprovalRequest, ApprovalAction
from app.models.enums import UserRole, ApprovalType, ApprovalStatus, AuditAction
from app.schemas.integrations import (
    ClearanceStatusResponse,
    ScholarshipSyncRequest,
    ScholarshipSyncResponse,
    NotificationDispatchRequest,
    NotificationLogResponse,
    CashflowForecastResponse,
    ExamPermissionRequestCreate,
    ExamPermissionResponse,
    ExamPermissionReviewRequest,
    ExamTimetableResponse,
    ExamCourseItem
)
from app.services.clearance_service import ClearanceService
from app.services.notification_service import NotificationService
from app.services.forecasting_service import ForecastingService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/integrations", tags=["Inter-Agent Integrations & Enterprise Hub"])

@router.get("/clearance/{student_id_or_roll}", response_model=ClearanceStatusResponse)
def get_student_financial_clearance(
    student_id_or_roll: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ClearanceStatusResponse:
    """
    Evaluates No-Dues financial clearance for Exam Hall Tickets, Degree Certificates, and Registration.
    """
    # Student and parent data isolation check
    if current_user.role == UserRole.STUDENT:
        if current_user.student_profile and current_user.student_profile.roll_no.upper() != student_id_or_roll.upper() and current_user.student_profile.id != student_id_or_roll:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Students can only view their own clearance status."
            )
    elif current_user.role == UserRole.PARENT:
        ward_rolls = [w.roll_no.upper() for w in (current_user.parent_profile.wards if current_user.parent_profile else [])]
        ward_ids = [w.id for w in (current_user.parent_profile.wards if current_user.parent_profile else [])]
        if student_id_or_roll.upper() not in ward_rolls and student_id_or_roll not in ward_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot view clearance for non-linked ward."
            )

    return ClearanceService.evaluate_clearance(db=db, student_id_or_roll=student_id_or_roll)

@router.post("/scholarships/sync", response_model=ScholarshipSyncResponse)
def sync_external_scholarship(
    payload: ScholarshipSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ACCOUNTS_OFFICER, UserRole.SYSTEM_ADMIN))
) -> ScholarshipSyncResponse:
    """
    Inbound Inter-Agent sync from Agent 42 (Scholarships & Financial Aid).
    """
    return ClearanceService.sync_external_scholarship(
        db=db,
        request=payload,
        actor_user=current_user
    )

@router.post("/notifications/dispatch", response_model=NotificationLogResponse)
def dispatch_notification(
    payload: NotificationDispatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ACCOUNTS_OFFICER, UserRole.SYSTEM_ADMIN))
) -> NotificationLogResponse:
    """
    Dispatches automated SMS/Email/WhatsApp alerts and records audit trail.
    """
    return NotificationService.dispatch_notification(
        db=db,
        request=payload,
        current_user=current_user
    )

@router.get("/notifications/logs", response_model=List[NotificationLogResponse])
def get_notification_logs(
    student_roll: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user)
) -> List[NotificationLogResponse]:
    """
    Retrieves activity log of automated notifications.
    """
    if current_user.role == UserRole.STUDENT and current_user.student_profile:
        student_roll = current_user.student_profile.roll_no

    return NotificationService.get_recent_notifications(
        student_roll=student_roll,
        event_type=event_type,
        limit=limit
    )

@router.get("/analytics/cashflow-forecast", response_model=CashflowForecastResponse)
def get_cashflow_forecast(
    horizon_days: int = Query(90, ge=30, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ACCOUNTS_OFFICER, UserRole.SYSTEM_ADMIN))
) -> CashflowForecastResponse:
    """
    Calculates 30/60/90-day probabilistic cashflow forecast and aging bucket recovery rates.
    """
    return ForecastingService.generate_cashflow_forecast(
        db=db,
        horizon_days=horizon_days
    )


def _format_exam_perm_response(req: ApprovalRequest, student: Student, action: Optional[ApprovalAction] = None) -> ExamPermissionResponse:
    details = {}
    if req.details_json:
        try:
            details = json.loads(req.details_json)
        except Exception:
            details = {}

    reviewed_by = action.approver.full_name if (action and action.approver) else details.get("reviewed_by")
    counsellor_remarks = action.comments if action else details.get("counsellor_remarks")
    reviewed_at = action.created_at if action else None

    return ExamPermissionResponse(
        id=req.id,
        approval_code=req.approval_code,
        student_id=student.id,
        student_roll=student.roll_no,
        student_name=student.user.full_name if student.user else details.get("student_name", "Student"),
        program=student.program.name if student.program else details.get("program", "Program"),
        semester=student.current_semester,
        outstanding_amount=float(req.requested_amount or 0.0),
        reason_category=details.get("reason_category", "OTHER"),
        reason=req.reason,
        commitment_date=details.get("commitment_date"),
        status=req.status.value,
        requested_at=req.created_at,
        reviewed_by=reviewed_by,
        reviewed_at=reviewed_at,
        valid_until=details.get("valid_until"),
        counsellor_remarks=counsellor_remarks
    )


@router.post("/exam-permission/request", response_model=ExamPermissionResponse)
def request_exam_permission(
    payload: ExamPermissionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ExamPermissionResponse:
    """
    Submits a special Exam Permission Request to the Counsellor Desk when Hall Ticket is locked due to dues.
    """
    student: Optional[Student] = None
    if current_user.role == UserRole.STUDENT:
        student = current_user.student_profile
        if not student:
            student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=400, detail="Authenticated user is not linked to a student profile.")
    else:
        if not payload.student_roll:
            raise HTTPException(status_code=400, detail="student_roll is required when submitting on behalf of a student.")
        student = db.query(Student).filter(Student.roll_no.ilike(payload.student_roll.strip())).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student '{payload.student_roll}' not found.")

    # Calculate current outstanding dues
    clearance = ClearanceService.evaluate_clearance(db=db, student_id_or_roll=student.id)
    out_amt = clearance.outstanding_amount

    # Check for existing PENDING request
    existing_req = db.query(ApprovalRequest).filter(
        ApprovalRequest.entity_type == "STUDENT",
        ApprovalRequest.entity_id == student.id,
        ApprovalRequest.approval_type == ApprovalType.EXAM_PERMISSION,
        ApprovalRequest.status == ApprovalStatus.PENDING
    ).first()

    details_payload = {
        "reason_category": payload.reason_category,
        "commitment_date": payload.commitment_date,
        "student_roll": student.roll_no,
        "student_name": student.user.full_name if student.user else "Student",
        "program": student.program.name if student.program else "Academic Program",
        "semester": student.current_semester,
        "outstanding_amount": float(out_amt)
    }

    if existing_req:
        existing_req.reason = payload.reason
        existing_req.requested_amount = float(out_amt)
        existing_req.details_json = json.dumps(details_payload)
        db.commit()
        db.refresh(existing_req)
        return _format_exam_perm_response(existing_req, student)

    # Generate new approval code
    code = f"APR-EXAM-2026-{random.randint(10000, 99999)}"
    perm_req = ApprovalRequest(
        approval_code=code,
        approval_type=ApprovalType.EXAM_PERMISSION,
        entity_type="STUDENT",
        entity_id=student.id,
        requested_by_id=current_user.id,
        requested_amount=float(out_amt),
        status=ApprovalStatus.PENDING,
        reason=payload.reason,
        details_json=json.dumps(details_payload)
    )
    db.add(perm_req)
    db.flush()

    AuditService.log_event(
        db=db,
        action=AuditAction.CREATE,
        resource_type="EXAM_PERMISSION_REQUEST",
        resource_id=perm_req.id,
        user_id=current_user.id,
        role=current_user.role,
        details={
            "approval_code": code,
            "student_roll": student.roll_no,
            "outstanding_amount": float(out_amt),
            "reason_category": payload.reason_category,
            "commitment_date": payload.commitment_date
        }
    )
    db.commit()
    db.refresh(perm_req)

    return _format_exam_perm_response(perm_req, student)


@router.get("/exam-permissions", response_model=List[ExamPermissionResponse])
def get_exam_permissions(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[ExamPermissionResponse]:
    """
    Retrieves list of student exam permission requests.
    Students see only their own; Finance/Counsellor staff see all.
    """
    query = db.query(ApprovalRequest).options(
        joinedload(ApprovalRequest.requested_by),
        joinedload(ApprovalRequest.actions).joinedload(ApprovalAction.approver)
    ).filter(ApprovalRequest.approval_type == ApprovalType.EXAM_PERMISSION)

    if current_user.role == UserRole.STUDENT:
        student_id = current_user.student_profile.id if current_user.student_profile else None
        if not student_id:
            return []
        query = query.filter(ApprovalRequest.entity_id == student_id)
    elif status_filter:
        query = query.filter(ApprovalRequest.status == status_filter.upper())

    records = query.order_by(ApprovalRequest.created_at.desc()).all()
    results = []
    for r in records:
        student = db.query(Student).options(
            joinedload(Student.user),
            joinedload(Student.program)
        ).filter(Student.id == r.entity_id).first()
        if student:
            last_action = r.actions[-1] if r.actions else None
            results.append(_format_exam_perm_response(r, student, last_action))
    return results


@router.post("/exam-permissions/{request_id}/review", response_model=ExamPermissionResponse)
def review_exam_permission(
    request_id: str,
    payload: ExamPermissionReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ACCOUNTS_OFFICER, UserRole.FINANCE_APPROVER, UserRole.SYSTEM_ADMIN))
) -> ExamPermissionResponse:
    """
    Counsellor / Finance action to APPROVE or REJECT a student exam permission request.
    """
    req = db.query(ApprovalRequest).filter(
        ApprovalRequest.id == request_id,
        ApprovalRequest.approval_type == ApprovalType.EXAM_PERMISSION
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Exam permission request not found.")

    student = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.program)
    ).filter(Student.id == req.entity_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student linked to permission request not found.")

    new_status = ApprovalStatus.APPROVED if payload.action.upper() == "APPROVED" else ApprovalStatus.REJECTED
    req.status = new_status

    # Update details_json with valid_until and comments
    details = {}
    if req.details_json:
        try:
            details = json.loads(req.details_json)
        except Exception:
            details = {}

    details["valid_until"] = payload.valid_until or "2026-06-30"
    details["counsellor_remarks"] = payload.comments or ""
    details["reviewed_by"] = current_user.full_name
    req.details_json = json.dumps(details)

    # Record action
    action = ApprovalAction(
        approval_request_id=req.id,
        approver_id=current_user.id,
        action=new_status.value,
        comments=payload.comments or f"Exam permission {new_status.value.lower()} by {current_user.full_name}"
    )
    db.add(action)

    AuditService.log_event(
        db=db,
        action=AuditAction.APPROVE if new_status == ApprovalStatus.APPROVED else AuditAction.REJECT,
        resource_type="EXAM_PERMISSION_REQUEST",
        resource_id=req.id,
        user_id=current_user.id,
        role=current_user.role,
        details={
            "approval_code": req.approval_code,
            "student_roll": student.roll_no,
            "action": new_status.value,
            "comments": payload.comments,
            "valid_until": details.get("valid_until")
        }
    )
    db.commit()
    db.refresh(req)

    return _format_exam_perm_response(req, student, action)


@router.get("/exam-timetable/{student_id_or_roll}", response_model=ExamTimetableResponse)
def get_exam_timetable(
    student_id_or_roll: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ExamTimetableResponse:
    """
    Generates official exam timetable and venue allocation for the student's program and semester.
    """
    student = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.program)
    ).filter(
        (Student.id == student_id_or_roll) | (Student.roll_no.ilike(student_id_or_roll.strip()))
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Isolation check
    if current_user.role == UserRole.STUDENT:
        if current_user.student_profile and current_user.student_profile.id != student.id and current_user.student_profile.roll_no.upper() != student.roll_no.upper():
            raise HTTPException(status_code=403, detail="Access denied: Cannot view another student's timetable.")

    clearance = ClearanceService.evaluate_clearance(db=db, student_id_or_roll=student.id)

    program_code = student.program.code if student.program else "CSE"
    program_name = student.program.name if student.program else "Computer Science & Engineering"

    # Deterministic course roster based on program
    courses_map = {
        "BTECH_CSE": [
            ("CS301", "Design and Analysis of Algorithms", "2026-05-18", "10:00 AM - 01:00 PM", "Block-A Room 302", "Desk #24"),
            ("CS302", "Operating Systems & Concurrency", "2026-05-20", "10:00 AM - 01:00 PM", "Block-A Room 302", "Desk #24"),
            ("CS303", "Database Management & Distributed Systems", "2026-05-22", "10:00 AM - 01:00 PM", "Block-A Room 302", "Desk #24"),
            ("CS304", "Computer Networks & Cloud Protocols", "2026-05-25", "10:00 AM - 01:00 PM", "Block-A Room 302", "Desk #24"),
            ("CS305", "Artificial Intelligence & Neural Networks", "2026-05-27", "10:00 AM - 01:00 PM", "Block-A Room 302", "Desk #24"),
        ],
        "BTECH_ECE": [
            ("EC301", "Signals and Systems Theory", "2026-05-18", "10:00 AM - 01:00 PM", "Block-B Room 104", "Desk #18"),
            ("EC302", "Analog & Digital Communication", "2026-05-20", "10:00 AM - 01:00 PM", "Block-B Room 104", "Desk #18"),
            ("EC303", "VLSI Architecture & CMOS Design", "2026-05-22", "10:00 AM - 01:00 PM", "Block-B Room 104", "Desk #18"),
            ("EC304", "Microprocessors and Embedded Systems", "2026-05-25", "10:00 AM - 01:00 PM", "Block-B Room 104", "Desk #18"),
            ("EC305", "Electromagnetic Fields & Waves", "2026-05-27", "10:00 AM - 01:00 PM", "Block-B Room 104", "Desk #18"),
        ],
        "BTECH_MECH": [
            ("ME301", "Thermodynamics & Heat Transfer", "2026-05-18", "10:00 AM - 01:00 PM", "Block-C Workshop Hall", "Desk #12"),
            ("ME302", "Fluid Mechanics & Turbo Machinery", "2026-05-20", "10:00 AM - 01:00 PM", "Block-C Workshop Hall", "Desk #12"),
            ("ME303", "Kinematics & Dynamics of Machines", "2026-05-22", "10:00 AM - 01:00 PM", "Block-C Workshop Hall", "Desk #12"),
            ("ME304", "Manufacturing Processes & CNC", "2026-05-25", "10:00 AM - 01:00 PM", "Block-C Workshop Hall", "Desk #12"),
            ("ME305", "Automobile & Robotics Engineering", "2026-05-27", "10:00 AM - 01:00 PM", "Block-C Workshop Hall", "Desk #12"),
        ]
    }

    raw_courses = courses_map.get(program_code) or [
        (f"{program_code[:3]}301", f"Core Theory I ({program_name})", "2026-05-18", "10:00 AM - 01:00 PM", "Academic Block Hall-1", "Desk #15"),
        (f"{program_code[:3]}302", f"Core Theory II ({program_name})", "2026-05-20", "10:00 AM - 01:00 PM", "Academic Block Hall-1", "Desk #15"),
        (f"{program_code[:3]}303", f"Applied Analytics & Systems", "2026-05-22", "10:00 AM - 01:00 PM", "Academic Block Hall-1", "Desk #15"),
        (f"{program_code[:3]}304", f"Professional Elective I", "2026-05-25", "10:00 AM - 01:00 PM", "Academic Block Hall-1", "Desk #15"),
        (f"{program_code[:3]}305", f"Open Elective & Interdisciplinary Studies", "2026-05-27", "10:00 AM - 01:00 PM", "Academic Block Hall-1", "Desk #15"),
    ]

    course_items = [
        ExamCourseItem(
            course_code=c[0],
            course_title=c[1],
            exam_date=c[2],
            session_time=c[3],
            exam_hall=c[4],
            seat_number=c[5]
        )
        for c in raw_courses
    ]

    perm = clearance.special_permission or {}

    return ExamTimetableResponse(
        student_id=student.id,
        roll_no=student.roll_no,
        student_name=student.user.full_name if student.user else "Student",
        program=program_name,
        semester=student.current_semester,
        academic_year="2025-2026 (Even Semester)",
        center_name="Main Campus Exam Complex, Vadlamudi, Guntur, AP",
        clearance_status=clearance.clearance_status,
        is_eligible=clearance.is_eligible_for_hall_ticket,
        attendance_percentage=clearance.attendance_percentage,
        is_attendance_eligible=clearance.is_attendance_eligible,
        special_permission_ref=perm.get("approval_code"),
        valid_until=perm.get("valid_until"),
        digital_signature=clearance.digital_signature,
        clearance_checklist=clearance.clearance_checklist,
        courses=course_items
    )


@router.post("/demo-reset")
def reset_demo_state(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Resets demo test students (Priya Sharma STU1002 and Meera Iyer STU1014/STU1010)
    to their clean unapproved blocked states, clearing any approval requests and actions.
    Enables repeat live demonstration for evaluators upon browser refresh or button click.
    """
    students = db.query(Student).options(joinedload(Student.user)).filter(
        Student.roll_no.in_(["STU1001", "STU1002", "STU1010", "STU1014"])
    ).all()
    student_ids = [s.id for s in students]

    reqs = db.query(ApprovalRequest).filter(
        ApprovalRequest.entity_id.in_(student_ids),
        ApprovalRequest.approval_type == ApprovalType.EXAM_PERMISSION
    ).all()

    for r in reqs:
        for a in r.actions:
            db.delete(a)
        db.delete(r)

    # Ensure deterministic benchmark states for demo personas
    for s in students:
        email = s.user.email if s.user else ""
        if email == "meera.i@student.edu" or s.roll_no in ("STU1010", "STU1014"):
            s.attendance_percentage = 68.0
        elif email == "priya.s@student.edu" or s.roll_no == "STU1002":
            s.attendance_percentage = 85.0
        elif email == "aravind.k@student.edu" or s.roll_no == "STU1001":
            s.attendance_percentage = 91.5

    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Demo state reset successfully! Priya Sharma (fees due: ₹1,18,000) and Meera Iyer (attendance shortage: 68%) are now in fresh blocked states for evaluator presentation.",
        "reset_students": ["STU1001", "STU1002", "STU1010", "STU1014"]
    }

