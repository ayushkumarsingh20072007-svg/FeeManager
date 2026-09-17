from typing import Dict, Any, Optional
from datetime import date
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.users import User, Student
from app.models.fee_demands import FeeDemand, FeeDemandItem
from app.models.enums import UserRole
from app.services.ledger_calculator import calculate_student_financials, to_decimal
from app.ai.tools.student_fee_tools import _resolve_authorized_student

def get_demand_status(
    db: Session,
    current_user: User,
    demand_id: Optional[str] = None,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Fetches current demand status, due date, installments, and reductions.
    """
    if demand_id:
        demand = db.query(FeeDemand).options(
            joinedload(FeeDemand.student).joinedload(Student.user),
            joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
            joinedload(FeeDemand.scholarships),
            joinedload(FeeDemand.concessions),
            joinedload(FeeDemand.waivers),
            joinedload(FeeDemand.payments),
        ).filter(FeeDemand.id == demand_id).first()

        if not demand:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Fee Demand '{demand_id}' not found.")

        # RBAC check
        if current_user.role == UserRole.STUDENT and demand.student_id != current_user.student_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot access another student's demand.")
        elif current_user.role == UserRole.PARENT:
            ward_ids = [w.id for w in (current_user.parent_profile.wards if current_user.parent_profile else [])]
            if demand.student_id not in ward_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot access non-linked ward's demand.")
    else:
        target_student = _resolve_authorized_student(db, current_user, student_id, roll_no)
        demand = db.query(FeeDemand).options(
            joinedload(FeeDemand.student).joinedload(Student.user),
            joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
            joinedload(FeeDemand.scholarships),
            joinedload(FeeDemand.concessions),
            joinedload(FeeDemand.waivers),
            joinedload(FeeDemand.payments),
        ).filter(FeeDemand.student_id == target_student.id).order_by(FeeDemand.created_at.desc()).first()

        if not demand:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No fee demand found for student.")

    calc = calculate_student_financials(demand, demand.payments or [], date.today())
    
    items = []
    for item in (demand.items or []):
        items.append({
            "head": item.fee_head.name if item.fee_head else "Fee Head",
            "gross": float(to_decimal(item.gross_amount)),
            "paid": float(to_decimal(getattr(item, "paid_amount", 0.0))),
            "status": item.status.value if hasattr(item.status, "value") else str(item.status)
        })

    return {
        "tool": "get_demand_status",
        "demand_id": demand.id,
        "demand_number": getattr(demand, "demand_number", demand.id),
        "student_roll": demand.student.roll_no if demand.student else "N/A",
        "student_name": demand.student.user.full_name if (demand.student and demand.student.user) else "N/A",
        "academic_year_id": demand.academic_year_id,
        "term": demand.term,
        "due_date": demand.due_date.isoformat() if demand.due_date else None,
        "gross_demand": float(calc["gross_demand"]),
        "scholarships": float(calc["scholarship_amount"]),
        "concessions": float(calc["concession_amount"]),
        "waivers": float(calc["waiver_amount"]),
        "net_demand": float(calc["net_demand"]),
        "paid_amount": float(calc["paid_amount"]),
        "outstanding_amount": float(calc["outstanding_amount"]),
        "status": calc["status"],
        "is_overdue": calc["is_overdue"],
        "items": items
    }
