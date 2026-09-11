"""
Authoritative Single Calculation Path for Student Ledgers.
Strictly implements:
- Decimal-safe arithmetic
- Gross Demand = SUM(FeeDemandItem.gross_amount)
- Reductions = Scholarship + Concession + Waiver
- Net Demand = max(0, Gross Demand - Reductions)
- Total Valid Paid = SUM(Payment.amount) for RECONCILED / RECEIVED payments
- Outstanding = max(0, Net Demand - Total Valid Paid)
- Status:
  * If Outstanding > 0 and due_date < today: OVERDUE
  * Else if Outstanding == 0 and Net Demand > 0 and Total Paid > 0: PAID
  * Else if Total Paid > 0 and Outstanding > 0: PARTIALLY_PAID
  * Else if Total Paid == 0 and Net Demand > 0: UNPAID (represented as PENDING/UNPAID)
  * Else if Net Demand == 0: PAID
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from typing import Dict, Any, Optional, List
from app.models.enums import FeeDemandStatus, PaymentStatus

TWO_PLACES = Decimal("0.01")

def to_decimal(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

def calculate_student_financials(
    demand: Optional[Any],
    payments: Optional[List[Any]] = None,
    current_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    Computes authoritative financial metrics for a student fee demand.
    """
    if current_date is None:
        current_date = date.today()

    if not demand:
        return {
            "gross_demand": Decimal("0.00"),
            "scholarship_amount": Decimal("0.00"),
            "concession_amount": Decimal("0.00"),
            "waiver_amount": Decimal("0.00"),
            "total_reductions": Decimal("0.00"),
            "net_demand": Decimal("0.00"),
            "paid_amount": Decimal("0.00"),
            "outstanding_amount": Decimal("0.00"),
            "status": "N/A",
            "due_date": None,
            "is_overdue": False,
        }

    # 1. Authoritative Gross Demand from FeeDemandItems
    if hasattr(demand, "items") and demand.items:
        gross_demand = sum(to_decimal(item.gross_amount) for item in demand.items)
    else:
        gross_demand = to_decimal(getattr(demand, "gross_demand", 0.0))

    # 2. Reductions
    scholarship_amount = Decimal("0.00")
    if hasattr(demand, "scholarships") and demand.scholarships:
        scholarship_amount = sum(
            to_decimal(s.amount) for s in demand.scholarships 
            if getattr(s, "status", "APPLIED") in ("APPLIED", "APPROVED")
        )
    else:
        scholarship_amount = to_decimal(getattr(demand, "scholarship_amount", 0.0))

    concession_amount = Decimal("0.00")
    if hasattr(demand, "concessions") and demand.concessions:
        concession_amount = sum(
            to_decimal(c.amount) for c in demand.concessions
            if getattr(c, "status", "APPROVED") in ("APPLIED", "APPROVED")
        )
    else:
        concession_amount = to_decimal(getattr(demand, "concession_amount", 0.0))

    waiver_amount = Decimal("0.00")
    if hasattr(demand, "waivers") and demand.waivers:
        waiver_amount = sum(
            to_decimal(w.amount) for w in demand.waivers
            if getattr(w, "status", "APPROVED") in ("APPLIED", "APPROVED")
        )
    else:
        waiver_amount = to_decimal(getattr(demand, "waiver_amount", 0.0))

    total_reductions = scholarship_amount + concession_amount + waiver_amount
    net_demand = max(Decimal("0.00"), gross_demand - total_reductions)

    # 3. Total Valid Paid Amount from Payment records
    if payments is not None:
        valid_statuses = {PaymentStatus.RECONCILED, PaymentStatus.RECEIVED, "RECONCILED", "RECEIVED"}
        paid_amount = sum(
            to_decimal(p.amount) for p in payments
            if getattr(p, "status", None) in valid_statuses
        )
    else:
        paid_amount = to_decimal(getattr(demand, "paid_amount", 0.0))

    # 4. Authoritative Outstanding Amount
    outstanding_amount = max(Decimal("0.00"), net_demand - paid_amount)

    # 5. Due Date & Status Determination
    due_date = getattr(demand, "due_date", None)
    is_overdue = False
    if due_date and outstanding_amount > Decimal("0.00"):
        if due_date < current_date:
            is_overdue = True

    if is_overdue:
        derived_status = FeeDemandStatus.OVERDUE.value
    elif outstanding_amount == Decimal("0.00") and net_demand > Decimal("0.00") and paid_amount > Decimal("0.00"):
        derived_status = FeeDemandStatus.PAID.value
    elif paid_amount > Decimal("0.00") and outstanding_amount > Decimal("0.00"):
        derived_status = FeeDemandStatus.PARTIALLY_PAID.value
    elif paid_amount == Decimal("0.00") and net_demand > Decimal("0.00"):
        derived_status = FeeDemandStatus.PENDING.value
    elif net_demand == Decimal("0.00"):
        derived_status = FeeDemandStatus.PAID.value
    else:
        derived_status = FeeDemandStatus.PENDING.value

    return {
        "gross_demand": gross_demand,
        "scholarship_amount": scholarship_amount,
        "concession_amount": concession_amount,
        "waiver_amount": waiver_amount,
        "total_reductions": total_reductions,
        "net_demand": net_demand,
        "paid_amount": paid_amount,
        "outstanding_amount": outstanding_amount,
        "status": derived_status,
        "due_date": due_date,
        "is_overdue": is_overdue,
    }
