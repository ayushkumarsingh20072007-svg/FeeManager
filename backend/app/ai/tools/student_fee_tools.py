from typing import Dict, Any, Optional
from datetime import date
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.users import User, Student
from app.models.fee_demands import FeeDemand, FeeDemandItem
from app.models.enums import UserRole
from app.services.ledger_calculator import calculate_student_financials, to_decimal

def _resolve_authorized_student(
    db: Session,
    current_user: User,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None
) -> Student:
    """
    Enforces server-side authorization and data isolation to resolve the target student.
    Never trusts client/LLM provided student_id if current_user is STUDENT or PARENT.
    """
    if current_user.role == UserRole.STUDENT:
        if not current_user.student_profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found for user.")
        # If student specified a different roll_no or student_id, reject or restrict strictly to self
        if student_id and student_id != current_user.student_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Students can only access their own fee records.")
        if roll_no and roll_no.upper() != current_user.student_profile.roll_no.upper():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Students can only access their own fee records.")
        return current_user.student_profile

    elif current_user.role == UserRole.PARENT:
        if not current_user.parent_profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent profile not found for user.")
        wards = current_user.parent_profile.wards
        if not wards:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No linked wards found for parent.")
        if student_id:
            ward = next((w for w in wards if w.id == student_id), None)
            if not ward:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Student is not a linked ward of this parent.")
            return ward
        if roll_no:
            ward = next((w for w in wards if w.roll_no.upper() == roll_no.upper()), None)
            if not ward:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Student is not a linked ward of this parent.")
            return ward
        return wards[0]

    # Authorized staff roles (ACCOUNTS_OFFICER, ADMIN, MANAGEMENT, FINANCE_APPROVER, SYSTEM_ADMIN)
    if student_id:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student ID '{student_id}' not found.")
        return student
    elif roll_no:
        student = db.query(Student).filter(Student.roll_no.ilike(roll_no.strip())).first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student with roll number '{roll_no}' not found.")
        return student
    else:
        # Default to first student in system for demo context if not specified by staff
        student = db.query(Student).first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No student records exist in the system.")
        return student

def _load_student_with_demands(db: Session, student_id: str) -> Student:
    """Loads student with fully joined fee demands, items, reductions, and payments."""
    student = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.program),
        joinedload(Student.admission_year),
        joinedload(Student.category),
        joinedload(Student.fee_demands).joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
        joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
        joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
        joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
    ).filter(Student.id == student_id).first()
    return student

def get_student_fee_summary(
    db: Session,
    current_user: User,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Computes exact student fee summary with Decimal math.
    """
    target = _resolve_authorized_student(db, current_user, student_id, roll_no)
    student = _load_student_with_demands(db, target.id)
    
    latest_demand = student.fee_demands[0] if student.fee_demands else None
    payments = latest_demand.payments if (latest_demand and latest_demand.payments) else []
    calc = calculate_student_financials(latest_demand, payments, date.today())

    return {
        "tool": "get_student_fee_summary",
        "student_id": student.id,
        "roll_no": student.roll_no,
        "name": student.user.full_name if student.user else "N/A",
        "program": student.program.name if student.program else "N/A",
        "academic_year": student.admission_year.year_code if student.admission_year else "N/A",
        "semester": student.current_semester,
        "gross_demand": float(calc["gross_demand"]),
        "scholarship_amount": float(calc["scholarship_amount"]),
        "concession_amount": float(calc["concession_amount"]),
        "waiver_amount": float(calc["waiver_amount"]),
        "total_reductions": float(calc["total_reductions"]),
        "net_demand": float(calc["net_demand"]),
        "paid_amount": float(calc["paid_amount"]),
        "outstanding_amount": float(calc["outstanding_amount"]),
        "status": calc["status"],
        "is_overdue": calc["is_overdue"],
        "due_date": str(calc["due_date"]) if calc["due_date"] else None,
    }

def get_outstanding_amount(
    db: Session,
    current_user: User,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Retrieves exact outstanding balance and overdue status.
    """
    summary = get_student_fee_summary(db, current_user, student_id, roll_no)
    return {
        "tool": "get_outstanding_amount",
        "student_id": summary["student_id"],
        "roll_no": summary["roll_no"],
        "name": summary["name"],
        "net_demand": summary["net_demand"],
        "paid_amount": summary["paid_amount"],
        "outstanding_amount": summary["outstanding_amount"],
        "status": summary["status"],
        "is_overdue": summary["is_overdue"],
        "due_date": summary["due_date"],
    }

def get_fee_breakdown(
    db: Session,
    current_user: User,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Provides head-wise itemized fee breakdown with allocated payments.
    """
    target = _resolve_authorized_student(db, current_user, student_id, roll_no)
    student = _load_student_with_demands(db, target.id)
    latest_demand = student.fee_demands[0] if student.fee_demands else None

    if not latest_demand:
        return {
            "tool": "get_fee_breakdown",
            "student_id": student.id,
            "roll_no": student.roll_no,
            "name": student.user.full_name if student.user else "N/A",
            "items": [],
            "total_gross": 0.0,
            "total_paid": 0.0,
            "total_outstanding": 0.0
        }

    items_breakdown = []
    for item in (latest_demand.items or []):
        gross = to_decimal(item.gross_amount)
        paid = to_decimal(getattr(item, "paid_amount", 0.0))
        outstanding = max(to_decimal(0), gross - paid)
        items_breakdown.append({
            "head_name": item.fee_head.name if item.fee_head else "Fee Head",
            "head_type": item.fee_head.head_type.value if (item.fee_head and hasattr(item.fee_head.head_type, "value")) else "STANDARD",
            "priority": getattr(item.fee_head, "priority", 99) if item.fee_head else 99,
            "gross_amount": float(gross),
            "paid_amount": float(paid),
            "outstanding_amount": float(outstanding)
        })

    # Sort by priority ascending (P1 Tuition first)
    items_breakdown.sort(key=lambda x: x["priority"])

    calc = calculate_student_financials(latest_demand, latest_demand.payments or [], date.today())
    return {
        "tool": "get_fee_breakdown",
        "student_id": student.id,
        "roll_no": student.roll_no,
        "name": student.user.full_name if student.user else "N/A",
        "demand_id": latest_demand.id,
        "items": items_breakdown,
        "gross_demand": float(calc["gross_demand"]),
        "net_demand": float(calc["net_demand"]),
        "paid_amount": float(calc["paid_amount"]),
        "outstanding_amount": float(calc["outstanding_amount"])
    }
