from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.users import User, Student
from app.models.payments import Payment, PaymentAllocation
from app.models.fee_demands import FeeDemandItem
from app.models.enums import UserRole
from app.services.ledger_calculator import to_decimal
from app.ai.tools.student_fee_tools import _resolve_authorized_student

def get_payment_history(
    db: Session,
    current_user: User,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Fetches real payment history with receipts and reconciliation statuses.
    """
    if current_user.role in (UserRole.STUDENT, UserRole.PARENT):
        target_student = _resolve_authorized_student(db, current_user, student_id, roll_no)
        q = db.query(Payment).options(
            joinedload(Payment.student).joinedload(Student.user),
            joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head)
        ).filter(Payment.student_id == target_student.id)
    else:
        # Authorized staff role
        if student_id or roll_no:
            target_student = _resolve_authorized_student(db, current_user, student_id, roll_no)
            q = db.query(Payment).options(
                joinedload(Payment.student).joinedload(Student.user),
                joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head)
            ).filter(Payment.student_id == target_student.id)
        else:
            q = db.query(Payment).options(
                joinedload(Payment.student).joinedload(Student.user),
                joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head)
            )

    payments = q.order_by(Payment.payment_date.desc()).limit(limit).all()

    items = []
    total_amount = to_decimal(0)
    for p in payments:
        amt = to_decimal(p.amount)
        total_amount += amt
        channel_val = p.channel.value if hasattr(p.channel, "value") else str(p.channel)
        recon_status = p.reconciliation.status.value if p.reconciliation and hasattr(p.reconciliation.status, "value") else str(p.status.value if hasattr(p.status, "value") else p.status)
        items.append({
            "payment_id": p.id,
            "student_roll": p.student.roll_no if p.student else "N/A",
            "student_name": p.student.user.full_name if (p.student and p.student.user) else "N/A",
            "amount": float(amt),
            "payment_date": p.payment_date.isoformat() if p.payment_date else None,
            "payment_channel": channel_val,
            "transaction_reference": p.transaction_id or p.utr_number or p.payment_ref,
            "receipt_number": p.receipt_number,
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "reconciliation_status": recon_status,
        })

    return {
        "tool": "get_payment_history",
        "count": len(items),
        "total_amount": float(total_amount),
        "payments": items
    }

def get_receipt_summary(
    db: Session,
    current_user: User,
    payment_id: Optional[str] = None,
    receipt_number: Optional[str] = None,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Fetches receipt details, transaction references, and timestamp.
    """
    q = db.query(Payment).options(
        joinedload(Payment.student).joinedload(Student.user),
        joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head)
    )

    if payment_id:
        q = q.filter(Payment.id == payment_id)
    elif receipt_number:
        q = q.filter(Payment.receipt_number.ilike(receipt_number.strip()))
    else:
        # Use latest payment of authorized student
        target_student = _resolve_authorized_student(db, current_user, student_id, roll_no)
        q = q.filter(Payment.student_id == target_student.id).order_by(Payment.payment_date.desc())

    payment = q.first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching payment or receipt found.")

    # Validate RBAC for student/parent
    if current_user.role == UserRole.STUDENT and payment.student_id != current_user.student_profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot access another student's receipt.")
    elif current_user.role == UserRole.PARENT:
        ward_ids = [w.id for w in (current_user.parent_profile.wards if current_user.parent_profile else [])]
        if payment.student_id not in ward_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot access non-linked ward's receipt.")

    allocations = []
    for a in payment.allocations:
        head_name = a.fee_demand_item.fee_head.name if (a.fee_demand_item and a.fee_demand_item.fee_head) else "Fee Head"
        allocations.append({
            "head_name": head_name,
            "allocated_amount": float(to_decimal(a.allocated_amount))
        })

    channel_val = payment.channel.value if hasattr(payment.channel, "value") else str(payment.channel)
    return {
        "tool": "get_receipt_summary",
        "payment_id": payment.id,
        "receipt_number": payment.receipt_number,
        "student_roll": payment.student.roll_no if payment.student else "N/A",
        "student_name": payment.student.user.full_name if (payment.student and payment.student.user) else "N/A",
        "amount_paid": float(to_decimal(payment.amount)),
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "payment_channel": channel_val,
        "transaction_reference": payment.transaction_id or payment.utr_number or payment.payment_ref,
        "status": payment.status.value if hasattr(payment.status, "value") else str(payment.status),
        "allocations": allocations
    }

def get_payment_allocation(
    db: Session,
    current_user: User,
    payment_id: Optional[str] = None,
    student_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Detailed breakdown of how a payment was allocated across prioritized fee heads.
    """
    return get_receipt_summary(db, current_user, payment_id=payment_id, student_id=student_id)
