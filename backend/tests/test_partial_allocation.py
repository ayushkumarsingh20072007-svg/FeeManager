"""
Tests for Phase 3 — Smart Partial Payment Allocation Engine.
Verifies deterministic priority ordering, zero over-allocation, and decimal conservation.
"""
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.models.fee_demands import FeeDemand, FeeDemandItem
from app.models.payments import Payment, PaymentAllocation
from app.models.users import Student
from app.services.allocation_engine import AllocationEngine

def test_priority_ordered_allocation():
    """Verifies that allocation exhaustively fills higher-priority fee heads before lower-priority ones."""
    db = SessionLocal()
    try:
        # Find student STU1019 (Gautam Gambhir - Net 178000, 0 paid)
        student = db.query(Student).filter(Student.roll_no == "STU1019").first()
        assert student is not None
        demand = db.query(FeeDemand).filter(FeeDemand.student_id == student.id).first()
        assert demand is not None

        # Sort items by priority
        items = sorted(demand.items, key=lambda it: getattr(it.fee_head, "priority_order", 999))
        tuition_item = items[0]
        assert tuition_item.fee_head.code == "TUITION"
        tuition_net = Decimal(str(tuition_item.net_amount))

        # Partial payment less than tuition fee (e.g. 50,000)
        pay_amount = Decimal("50000.00")
        allocations = AllocationEngine.allocate_payment(
            demand=demand,
            payment_amount=pay_amount,
            payment_id="DUMMY-PAY-1019-1",
            db=db
        )

        assert len(allocations) == 1
        assert allocations[0].fee_demand_item_id == tuition_item.id
        assert Decimal(str(allocations[0].allocated_amount)) == pay_amount
        assert Decimal(str(tuition_item.paid_amount)) == pay_amount

        # Rollback temporary allocation
        db.rollback()
    finally:
        db.close()

def test_multi_tier_cross_item_allocation():
    """Payment exceeding tuition spills over into next fee head (EXAMINATION, etc.)."""
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1023").first()
        assert student is not None
        demand = db.query(FeeDemand).filter(FeeDemand.student_id == student.id).first()
        assert demand is not None

        items = sorted(demand.items, key=lambda it: getattr(it.fee_head, "priority_order", 999))
        tuition_item = items[0]
        tuition_net = Decimal(str(tuition_item.net_amount))  # 1,20,000

        # Pay 1,30,000 (120,000 for Tuition + 10,000 for Examination)
        pay_amount = Decimal("130000.00")
        allocations = AllocationEngine.allocate_payment(
            demand=demand,
            payment_amount=pay_amount,
            payment_id="DUMMY-PAY-1023-SPILL",
            db=db
        )

        assert len(allocations) >= 2
        alloc_tuition = next(a for a in allocations if a.fee_demand_item_id == tuition_item.id)
        assert Decimal(str(alloc_tuition.allocated_amount)) == tuition_net

        total_allocated = sum(Decimal(str(a.allocated_amount)) for a in allocations)
        assert total_allocated == pay_amount

        db.rollback()
    finally:
        db.close()

def test_multiple_sequential_partial_payments():
    """Verifies that multiple partial payments accurately accumulate without double counting."""
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1017").first()
        assert student is not None
        demand = db.query(FeeDemand).filter(FeeDemand.student_id == student.id).first()
        assert demand is not None

        # Payment 1: 40,000
        pay1 = Decimal("40000.00")
        alloc1 = AllocationEngine.allocate_payment(
            demand=demand,
            payment_amount=pay1,
            payment_id="DUMMY-PAY-SEQ-1",
            db=db
        )
        assert sum(Decimal(str(a.allocated_amount)) for a in alloc1) == pay1

        # Payment 2: 60,000
        pay2 = Decimal("60000.00")
        alloc2 = AllocationEngine.allocate_payment(
            demand=demand,
            payment_amount=pay2,
            payment_id="DUMMY-PAY-SEQ-2",
            db=db
        )
        assert sum(Decimal(str(a.allocated_amount)) for a in alloc2) == pay2

        # Verify total paid on demand items
        total_items_paid = sum(Decimal(str(it.paid_amount)) for it in demand.items)
        assert total_items_paid == pay1 + pay2

        db.rollback()
    finally:
        db.close()

def test_exact_decimal_sum_equality():
    """Allocation must preserve exact Decimal equality down to the last paisa."""
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.roll_no == "STU1024").first()
        assert student is not None
        demand = db.query(FeeDemand).filter(FeeDemand.student_id == student.id).first()
        assert demand is not None

        pay_amt = Decimal("12345.67")
        allocations = AllocationEngine.allocate_payment(
            demand=demand,
            payment_amount=pay_amt,
            payment_id="DUMMY-PAY-EXACT-DEC",
            db=db
        )
        allocated_total = sum(Decimal(str(a.allocated_amount)) for a in allocations)
        assert allocated_total == pay_amt

        db.rollback()
    finally:
        db.close()
