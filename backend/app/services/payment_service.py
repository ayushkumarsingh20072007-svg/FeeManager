"""
Payment Service for Agent 40 — Phase 3.
Handles deterministic payment collection, validation, smart partial allocation,
reversals, demand status updates, receipt generation, and audit logging.
"""
from decimal import Decimal
from datetime import datetime, timezone, date
from typing import List, Optional, Dict, Any
import uuid

from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.enums import UserRole, PaymentChannel, PaymentStatus, FeeDemandStatus, AuditAction
from app.models.users import User, Student
from app.models.fee_demands import FeeDemand, FeeDemandItem
from app.models.payments import Payment, PaymentAllocation
from app.models.documents import Receipt
from app.schemas.payments import PaymentCreateRequest, PaymentResponse, PaymentAllocationResponse
from app.services.ledger_calculator import to_decimal, calculate_student_financials
from app.services.allocation_engine import AllocationEngine
from app.services.receipt_generator import ReceiptGenerator
from app.services.audit_service import AuditService

class PaymentService:

    @classmethod
    def record_payment(
        cls,
        payload: PaymentCreateRequest,
        current_user: User,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Records a new official payment, allocates it across demand items,
        updates demand outstanding balances & status, triggers receipt generation,
        and logs audit trail.
        """
        # 1. Authorize actor
        allowed_roles = {UserRole.ACCOUNTS_OFFICER, UserRole.ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_APPROVER}
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only authorized finance staff may record official payments."
            )

        # 2. Validate student
        student = db.query(Student).filter(
            (Student.id == payload.student_id) | (Student.roll_no == payload.student_id)
        ).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID/Roll '{payload.student_id}' not found."
            )

        # 3. Resolve active FeeDemand
        if payload.fee_demand_id:
            demand = db.query(FeeDemand).filter(
                FeeDemand.id == payload.fee_demand_id,
                FeeDemand.student_id == student.id
            ).first()
            if not demand:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"FeeDemand '{payload.fee_demand_id}' does not belong to student {student.roll_no}."
                )
        else:
            # Find the most relevant active/unpaid demand
            demand = db.query(FeeDemand).filter(
                FeeDemand.student_id == student.id,
                FeeDemand.status.in_([FeeDemandStatus.PENDING, FeeDemandStatus.PARTIALLY_PAID, FeeDemandStatus.OVERDUE])
            ).order_by(FeeDemand.due_date.asc()).first()

            if not demand:
                # Fallback to any demand
                demand = db.query(FeeDemand).filter(
                    FeeDemand.student_id == student.id
                ).order_by(FeeDemand.generation_date.desc()).first()

        if not demand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active fee demand found for student {student.roll_number}."
            )

        # 4. Validate Amount
        pay_amount = to_decimal(payload.amount)
        if pay_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be greater than zero."
            )

        # Check demand outstanding balance
        remaining_outstanding = to_decimal(demand.outstanding_amount)
        if remaining_outstanding <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Over-allocation error: Demand '{demand.demand_code}' is already fully paid with ₹0.00 outstanding."
            )
        if pay_amount > remaining_outstanding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Over-allocation error: Payment amount ₹{pay_amount} exceeds remaining demand outstanding ₹{remaining_outstanding}."
            )

        # 5. Duplicate transaction check
        if payload.transaction_id:
            existing_txn = db.query(Payment).filter(
                Payment.transaction_id == payload.transaction_id
            ).first()
            if existing_txn:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate transaction ID '{payload.transaction_id}' already recorded."
                )

        now = datetime.now(timezone.utc)
        payment_date = payload.payment_date or now
        if payment_date.tzinfo is None:
            payment_date = payment_date.replace(tzinfo=timezone.utc)

        # Generate unique payment reference
        ref_suffix = uuid.uuid4().hex[:6].upper()
        month_code = payment_date.strftime("%Y%m")
        payment_ref = f"PAY-{month_code}-{ref_suffix}"

        # 6. Create Payment Record
        # Counter/Cash/Direct are marked RECEIVED; gateways can be RECEIVED
        payment = Payment(
            payment_ref=payment_ref,
            student_id=student.id,
            fee_demand_id=demand.id,
            amount=float(pay_amount),
            channel=payload.channel,
            status=PaymentStatus.RECEIVED,
            transaction_id=payload.transaction_id,
            utr_number=payload.utr_number,
            payment_date=payment_date,
            gateway_name=payload.gateway_name,
            notes=payload.notes,
        )
        db.add(payment)
        db.flush()

        # 7. Smart Partial Payment Allocation
        allocations = AllocationEngine.allocate_payment(
            demand=demand,
            payment_amount=pay_amount,
            payment_id=payment.id,
            db=db
        )

        # 8. Recalculate Demand Totals and Status
        demand.paid_amount = float(sum(to_decimal(it.paid_amount) for it in demand.items))
        demand.outstanding_amount = float(max(
            Decimal("0.00"),
            to_decimal(demand.net_demand) - to_decimal(demand.paid_amount)
        ))

        today = date.today()
        if demand.outstanding_amount == 0:
            demand.status = FeeDemandStatus.PAID
        elif demand.paid_amount > 0 and demand.outstanding_amount > 0:
            demand.status = FeeDemandStatus.PARTIALLY_PAID
        elif demand.due_date < today:
            demand.status = FeeDemandStatus.OVERDUE
        else:
            demand.status = FeeDemandStatus.PENDING

        db.flush()

        # 9. Generate Fee Receipt
        receipt_data = ReceiptGenerator.get_or_create_receipt(db=db, payment_id=payment.id)
        payment.receipt_number = receipt_data.get("receipt_number")

        # 10. Audit Logging
        AuditService.log_event(
            db=db,
            user_id=current_user.id,
            action=AuditAction.CREATE,
            entity_type="Payment",
            entity_id=payment.id,
            details={
                "payment_ref": payment.payment_ref,
                "student_roll": student.roll_no,
                "amount": float(pay_amount),
                "channel": payment.channel.value if hasattr(payment.channel, "value") else str(payment.channel),
                "demand_id": demand.id,
                "allocations_count": len(allocations),
                "receipt_number": payment.receipt_number,
                "new_demand_outstanding": demand.outstanding_amount,
                "new_demand_status": demand.status.value if hasattr(demand.status, "value") else str(demand.status),
            }
        )

        db.commit()

        return {
            "payment": payment,
            "receipt": receipt_data,
            "allocations": allocations,
            "demand": demand,
        }

    @classmethod
    def reverse_payment(
        cls,
        payment_id: str,
        reason: str,
        current_user: User,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Reverses a recorded payment, deallocates fee head amounts,
        restores demand outstanding balance & status, and logs audit trail.
        """
        # 1. Authorize actor
        allowed_roles = {UserRole.FINANCE_APPROVER, UserRole.ADMIN, UserRole.SYSTEM_ADMIN}
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only Finance Approver or Admin may reverse official payments."
            )

        payment = db.query(Payment).options(
            joinedload(Payment.fee_demand).joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
            joinedload(Payment.student),
        ).filter(Payment.id == payment_id).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Payment '{payment_id}' not found."
            )

        if payment.status in (PaymentStatus.REVERSED, PaymentStatus.CANCELLED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment '{payment.payment_ref}' is already {payment.status}."
            )

        demand = payment.fee_demand
        if not demand:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment has no associated Fee Demand to reverse."
            )

        # 2. Deallocate amounts
        deallocated_amount = AllocationEngine.deallocate_payment(payment=payment, db=db)

        # 3. Mark payment REVERSED
        old_status = payment.status
        payment.status = PaymentStatus.REVERSED
        reversal_note = f"[REVERSED by {current_user.full_name} on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}: {reason}]"
        payment.notes = f"{payment.notes or ''} {reversal_note}".strip()

        # 4. Recalculate demand balances & status
        demand.paid_amount = float(sum(to_decimal(it.paid_amount) for it in demand.items))
        demand.outstanding_amount = float(max(
            Decimal("0.00"),
            to_decimal(demand.net_demand) - to_decimal(demand.paid_amount)
        ))

        today = date.today()
        if demand.outstanding_amount == 0:
            demand.status = FeeDemandStatus.PAID
        elif demand.paid_amount > 0 and demand.outstanding_amount > 0:
            demand.status = FeeDemandStatus.PARTIALLY_PAID
        elif demand.due_date < today:
            demand.status = FeeDemandStatus.OVERDUE
        else:
            demand.status = FeeDemandStatus.PENDING

        db.flush()

        # 5. Audit log
        AuditService.log_event(
            db=db,
            user_id=current_user.id,
            action=AuditAction.REVERSE,
            entity_type="Payment",
            entity_id=payment.id,
            details={
                "payment_ref": payment.payment_ref,
                "student_roll": payment.student.roll_no if payment.student else "N/A",
                "reversed_amount": float(deallocated_amount),
                "reason": reason,
                "old_status": old_status.value if hasattr(old_status, "value") else str(old_status),
                "new_demand_outstanding": demand.outstanding_amount,
                "new_demand_status": demand.status.value if hasattr(demand.status, "value") else str(demand.status),
            }
        )

        db.commit()

        return {
            "payment_id": payment.id,
            "payment_ref": payment.payment_ref,
            "status": payment.status.value if hasattr(payment.status, "value") else str(payment.status),
            "reversed_amount": float(deallocated_amount),
            "restored_outstanding": demand.outstanding_amount,
            "demand_status": demand.status.value if hasattr(demand.status, "value") else str(demand.status),
            "message": f"Payment {payment.payment_ref} successfully reversed. Restored ₹{deallocated_amount} to demand."
        }
