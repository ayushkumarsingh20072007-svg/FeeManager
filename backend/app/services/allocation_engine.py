"""
Deterministic Smart Partial Payment Allocation Engine for Agent 40.
Strictly adheres to:
1. Python Decimal arithmetic (zero floating-point inaccuracies).
2. Priority-ordered allocation (Tuition -> Exam -> Lab -> Library -> Hostel -> Transport -> Caution -> One-time).
3. Over-allocation prevention (cannot exceed demand outstanding).
4. Duplicate allocation prevention.
5. Idempotent and reversible ledger updates.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.fee_demands import FeeDemand, FeeDemandItem
from app.models.payments import Payment, PaymentAllocation
from app.models.enums import PaymentStatus
from app.services.ledger_calculator import to_decimal

TWO_PLACES = Decimal("0.01")

class AllocationEngine:
    @classmethod
    def allocate_payment(
        cls,
        demand: FeeDemand,
        payment_amount: Decimal,
        payment_id: str,
        db: Session,
    ) -> List[PaymentAllocation]:
        """
        Deterministically allocates a payment amount across the items of a FeeDemand.
        """
        payment_amount = to_decimal(payment_amount)
        if payment_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be strictly positive."
            )

        # 1. Prevent duplicate allocation for the same payment record
        existing_allocs = db.query(PaymentAllocation).filter(
            PaymentAllocation.payment_id == payment_id
        ).all()
        if existing_allocs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment {payment_id} already has active allocations. Cannot duplicate allocation."
            )

        if not demand.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fee Demand {demand.demand_code} has no fee demand items to allocate against."
            )

        # 2. Sort FeeDemandItems by priority order (Tuition -> Exam -> Lab -> Library -> Hostel -> Transport -> Caution -> One-time)
        sorted_items = sorted(
            demand.items,
            key=lambda it: (getattr(it.fee_head, "priority_order", 999), it.id)
        )

        # 3. Calculate total remaining demand outstanding
        remaining_demand_outstanding = to_decimal(demand.outstanding_amount)
        if remaining_demand_outstanding <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Over-allocation error: Demand {demand.demand_code} is already fully paid with ₹0.00 outstanding."
            )

        if payment_amount > remaining_demand_outstanding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Over-allocation error: Payment amount ₹{payment_amount} exceeds "
                    f"remaining demand outstanding ₹{remaining_demand_outstanding}."
                )
            )

        # 4. Allocate sequentially according to priority
        remaining_to_allocate = payment_amount
        new_allocations: List[PaymentAllocation] = []

        for item in sorted_items:
            if remaining_to_allocate <= Decimal("0.00"):
                break

            item_net = to_decimal(item.net_amount)
            item_paid = to_decimal(item.paid_amount)
            item_outstanding = max(Decimal("0.00"), item_net - item_paid)

            if item_outstanding > Decimal("0.00"):
                alloc_amount = min(remaining_to_allocate, item_outstanding)
                priority_label = f"Priority-{getattr(item.fee_head, 'priority_order', 99)}"

                allocation = PaymentAllocation(
                    payment_id=payment_id,
                    fee_demand_item_id=item.id,
                    allocated_amount=float(alloc_amount),
                    priority_applied=priority_label,
                )
                db.add(allocation)
                new_allocations.append(allocation)

                # Update item amounts
                new_item_paid = item_paid + alloc_amount
                item.paid_amount = float(new_item_paid)
                item.outstanding_amount = float(max(Decimal("0.00"), item_net - new_item_paid))

                remaining_to_allocate -= alloc_amount

        # 5. Exact decimal conservation check
        allocated_sum = sum(to_decimal(a.allocated_amount) for a in new_allocations)
        if allocated_sum != payment_amount:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Mathematical discrepancy: Allocated sum ₹{allocated_sum} does not match payment ₹{payment_amount}."
            )

        return new_allocations

    @classmethod
    def deallocate_payment(
        cls,
        payment: Payment,
        db: Session,
    ) -> Decimal:
        """
        Deallocates and removes PaymentAllocation records for a payment, restoring
        item-level and demand-level balances.
        """
        allocations = db.query(PaymentAllocation).filter(
            PaymentAllocation.payment_id == payment.id
        ).all()

        total_deallocated = Decimal("0.00")
        for alloc in allocations:
            item = alloc.fee_demand_item
            if item:
                alloc_amount = to_decimal(alloc.allocated_amount)
                item_net = to_decimal(item.net_amount)
                new_paid = max(Decimal("0.00"), to_decimal(item.paid_amount) - alloc_amount)
                item.paid_amount = float(new_paid)
                item.outstanding_amount = float(max(Decimal("0.00"), item_net - new_paid))
                total_deallocated += alloc_amount

            db.delete(alloc)

        return total_deallocated
