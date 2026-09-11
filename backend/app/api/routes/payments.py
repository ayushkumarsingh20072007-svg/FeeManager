from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.users import User, Student
from app.models.payments import Payment, PaymentAllocation
from app.models.fee_demands import FeeDemandItem
from app.models.enums import UserRole
from app.schemas.payments import (
    PaymentCreateRequest,
    PaymentResponse,
    PaymentAllocationResponse,
    PaymentReversalRequest,
    PaymentReversalResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter(tags=["Payments & Allocation"])

def _serialize_payment(payment: Payment) -> PaymentResponse:
    alloc_responses = []
    if payment.allocations:
        for a in payment.allocations:
            head_name = None
            head_type = None
            if a.fee_demand_item and a.fee_demand_item.fee_head:
                head_name = a.fee_demand_item.fee_head.name
                head_type = a.fee_demand_item.fee_head.head_type.value if hasattr(a.fee_demand_item.fee_head.head_type, "value") else str(a.fee_demand_item.fee_head.head_type)
            alloc_responses.append(PaymentAllocationResponse(
                id=a.id,
                fee_demand_item_id=a.fee_demand_item_id,
                fee_head_name=head_name,
                fee_head_type=head_type,
                allocated_amount=a.allocated_amount,
                priority_applied=a.priority_applied,
            ))

    receipt_id = payment.receipts[0].id if payment.receipts else None

    return PaymentResponse(
        id=payment.id,
        payment_ref=payment.payment_ref,
        student_id=payment.student_id,
        student_roll=payment.student.roll_number if payment.student else None,
        student_name=payment.student.user.full_name if payment.student and payment.student.user else None,
        fee_demand_id=payment.fee_demand_id,
        amount=payment.amount,
        channel=payment.channel.value if hasattr(payment.channel, "value") else str(payment.channel),
        status=payment.status.value if hasattr(payment.status, "value") else str(payment.status),
        transaction_id=payment.transaction_id,
        utr_number=payment.utr_number,
        receipt_number=payment.receipt_number,
        receipt_id=receipt_id,
        payment_date=payment.payment_date,
        notes=payment.notes,
        allocations=alloc_responses,
        created_at=payment.created_at,
    )

def _check_payment_access(payment: Payment, current_user: User, db: Session):
    """Enforces strict server-side authorization for payment record access."""
    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and payment.student_id == current_user.student.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot view payments for another student."
            )
    elif current_user.role == UserRole.PARENT:
        s = payment.student or db.query(Student).filter(Student.id == payment.student_id).first()
        if not (s and current_user.parent and s.parent_id == current_user.parent.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot view payments for unrelated students."
            )

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    payload: PaymentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Records an official fee payment with deterministic smart partial allocation.
    Finance/Accounts officers and Administrators only.
    """
    result = PaymentService.record_payment(payload=payload, current_user=current_user, db=db)
    payment = result["payment"]
    # Re-query with full relationships for response serialization
    hydrated_payment = db.query(Payment).options(
        joinedload(Payment.student).joinedload(Student.user),
        joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head),
        joinedload(Payment.receipts)
    ).filter(Payment.id == payment.id).first()
    return _serialize_payment(hydrated_payment)

@router.get("/payments", response_model=List[PaymentResponse])
def list_payments(
    student_id: Optional[str] = Query(None, description="Filter by Student ID or Roll"),
    channel: Optional[str] = Query(None, description="Filter by Payment Channel"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by Payment Status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists payments with strict RBAC data isolation.
    """
    query = db.query(Payment).options(
        joinedload(Payment.student).joinedload(Student.user),
        joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head),
        joinedload(Payment.receipts)
    )

    if current_user.role == UserRole.STUDENT:
        if not current_user.student:
            return []
        query = query.filter(Payment.student_id == current_user.student.id)
    elif current_user.role == UserRole.PARENT:
        if not current_user.parent:
            return []
        ward_ids = [w.id for w in current_user.parent.students]
        query = query.filter(Payment.student_id.in_(ward_ids))
    else:
        # Staff/Admin
        if student_id:
            s = db.query(Student).filter((Student.id == student_id) | (Student.roll_no == student_id)).first()
            if s:
                query = query.filter(Payment.student_id == s.id)
            else:
                return []

    if channel and channel != "ALL":
        query = query.filter(Payment.channel == channel)
    if status_filter and status_filter != "ALL":
        query = query.filter(Payment.status == status_filter)

    payments = query.order_by(Payment.payment_date.desc()).all()
    return [_serialize_payment(p) for p in payments]

@router.get("/payments/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves details and allocation breakdown for a single payment.
    """
    payment = db.query(Payment).options(
        joinedload(Payment.student).joinedload(Student.user),
        joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head),
        joinedload(Payment.receipts)
    ).filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment record '{payment_id}' not found."
        )

    _check_payment_access(payment, current_user, db)
    return _serialize_payment(payment)

@router.get("/students/{student_id}/payments", response_model=List[PaymentResponse])
def get_student_payments(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves all payment records for a specific student, enforcing RBAC isolation.
    """
    student = db.query(Student).filter(
        (Student.id == student_id) | (Student.roll_no == student_id)
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{student_id}' not found."
        )

    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and current_user.student.id == student.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot access payments of other students."
            )
    elif current_user.role == UserRole.PARENT:
        if not (current_user.parent and student.parent_id == current_user.parent.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot access payments of unrelated students."
            )

    payments = db.query(Payment).options(
        joinedload(Payment.student).joinedload(Student.user),
        joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head),
        joinedload(Payment.receipts)
    ).filter(Payment.student_id == student.id).order_by(Payment.payment_date.desc()).all()

    return [_serialize_payment(p) for p in payments]

@router.post("/payments/{payment_id}/reverse", response_model=PaymentReversalResponse)
def reverse_payment(
    payment_id: str,
    payload: PaymentReversalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reverses a payment, restores demand balance, and marks payment REVERSED.
    Finance Approver / Admin roles only.
    """
    res = PaymentService.reverse_payment(
        payment_id=payment_id,
        reason=payload.reason,
        current_user=current_user,
        db=db
    )
    return PaymentReversalResponse(**res)
