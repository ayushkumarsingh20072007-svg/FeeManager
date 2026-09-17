from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.users import User, Student
from app.models.payments import Payment
from app.models.fee_demands import FeeDemand
from app.models.academics import Program
from app.models.enums import UserRole, PaymentStatus
from app.schemas.analytics import (
    CollectionTrendResponse,
    CollectionTrendItem,
    AgingDistributionResponse,
    AgingDistributionItem,
    ProgramDefaulterHeatmapResponse,
    HeatmapCellDetail,
)
from app.services.ledger_calculator import calculate_student_financials, to_decimal

router = APIRouter(prefix="/analytics", tags=["Analytics & Visual Intelligence"])

ALLOWED_STAFF_ROLES = {
    UserRole.ACCOUNTS_OFFICER,
    UserRole.FINANCE_APPROVER,
    UserRole.MANAGEMENT,
    UserRole.ADMIN,
    UserRole.SYSTEM_ADMIN,
}

def check_staff_permission(user: User):
    if user.role not in ALLOWED_STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role}' is not authorized to access financial analytics endpoints."
        )

@router.get("/collection-trend", response_model=CollectionTrendResponse)
def get_collection_trend(
    months: int = Query(6, ge=1, le=12, description="Number of past months to include"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns monthly fee collection totals vs targets for the last N months.
    RBAC: Staff roles only.
    """
    check_staff_permission(current_user)

    today = date.today()
    # Build list of target YYYY-MM months ending in current month
    month_keys = []
    for i in range(months - 1, -1, -1):
        # Calculate year/month subtracting i months
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        month_keys.append(f"{y:04d}-{m:02d}")

    # Query SQL aggregations from payments table for valid statuses
    valid_statuses = [PaymentStatus.RECONCILED.value, PaymentStatus.RECEIVED.value, "RECONCILED", "RECEIVED"]

    # Query all valid payments
    payments = db.query(Payment).filter(Payment.status.in_(valid_statuses)).all()

    monthly_totals: Dict[str, Decimal] = {mk: Decimal("0.00") for mk in month_keys}
    for p in payments:
        p_date = getattr(p, "payment_date", None) or getattr(p, "created_at", None)
        if p_date:
            if hasattr(p_date, "strftime"):
                mk = p_date.strftime("%Y-%m")
            else:
                mk = str(p_date)[:7]
            if mk in monthly_totals:
                monthly_totals[mk] += to_decimal(p.amount)

    # Calculate average gross demand to estimate monthly target baseline
    total_gross_demand = db.query(func.sum(FeeDemand.net_demand)).scalar() or 0.0
    baseline_target = Decimal(str(total_gross_demand or 35000000.00)) / Decimal("10.0")

    items = []
    total_collected_6m = Decimal("0.00")

    # If recent data is concentrated in current months, assign realistic targets
    for mk in month_keys:
        collected = monthly_totals[mk]
        # Target baseline between 30L and 45L per month
        target = baseline_target if baseline_target > Decimal("1000000.00") else Decimal("3500000.00")
        if collected > Decimal("0.00"):
            achieved_pct = float((collected / target * Decimal("100")).quantize(Decimal("0.1")))
        else:
            achieved_pct = 0.0

        total_collected_6m += collected
        items.append(CollectionTrendItem(
            month=mk,
            collected=float(collected),
            target=float(target),
            achievement_percentage=achieved_pct
        ))

    avg_monthly = float((total_collected_6m / Decimal(str(months))).quantize(Decimal("0.01")))

    return CollectionTrendResponse(
        data=items,
        total_collected_6m=float(total_collected_6m),
        average_monthly=avg_monthly
    )

@router.get("/aging-distribution", response_model=AgingDistributionResponse)
def get_aging_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns outstanding amount grouped by aging bucket (Current, 0-30 days, 31-60 days, 60+ days).
    RBAC: Staff roles only.
    """
    check_staff_permission(current_user)

    today = date.today()
    students = db.query(Student).options(
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments)
    ).all()

    buckets_data = {
        "Current": {"bucket_code": "CURRENT", "amount": Decimal("0.00"), "count": 0, "color": "#10B981"},      # Emerald
        "0-30 days": {"bucket_code": "BUCKET_1", "amount": Decimal("0.00"), "count": 0, "color": "#3B82F6"},    # Blue
        "31-60 days": {"bucket_code": "BUCKET_2", "amount": Decimal("0.00"), "count": 0, "color": "#F59E0B"},   # Amber
        "60+ days": {"bucket_code": "BUCKET_3_PLUS", "amount": Decimal("0.00"), "count": 0, "color": "#EF4444"} # Red
    }

    total_outstanding = Decimal("0.00")
    total_defaulters = 0

    for s in students:
        if not s.fee_demands:
            continue
        demand = s.fee_demands[0]
        calc = calculate_student_financials(demand, demand.payments, current_date=today)
        out_amt = calc["outstanding_amount"]
        if out_amt <= Decimal("0.00"):
            # Fully paid students belong to Current with 0 outstanding
            continue

        due_date = calc["due_date"]
        if not due_date or due_date >= today:
            b_key = "Current"
        else:
            overdue_days = (today - due_date).days
            if overdue_days <= 30:
                b_key = "0-30 days"
            elif overdue_days <= 60:
                b_key = "31-60 days"
            else:
                b_key = "60+ days"

        buckets_data[b_key]["amount"] += out_amt
        buckets_data[b_key]["count"] += 1
        total_outstanding += out_amt
        total_defaulters += 1

    items = []
    for b_name, b_info in buckets_data.items():
        items.append(AgingDistributionItem(
            bucket=b_name,
            bucket_code=b_info["bucket_code"],
            amount=float(b_info["amount"]),
            count=b_info["count"],
            color=b_info["color"]
        ))

    return AgingDistributionResponse(
        data=items,
        total_outstanding=float(total_outstanding),
        total_defaulters=total_defaulters
    )

@router.get("/program-defaulter-heatmap", response_model=ProgramDefaulterHeatmapResponse)
def get_program_defaulter_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns a program x aging-bucket matrix with student counts and outstanding details.
    RBAC: Staff roles only.
    """
    check_staff_permission(current_user)

    today = date.today()
    programs = db.query(Program).order_by(Program.code).all()
    program_codes = [p.code for p in programs] if programs else ["BTECH-CSE", "BTECH-ECE", "BTECH-MECH", "MBA", "MCA"]
    buckets = ["Current", "0-30 days", "31-60 days", "60+ days"]

    # Initialize cell details
    details: Dict[str, Dict[str, Any]] = {}
    for p in program_codes:
        for b in buckets:
            cell_key = f"{p}_{b}"
            details[cell_key] = {"count": 0, "amount": Decimal("0.00"), "student_ids": []}

    students = db.query(Student).options(
        joinedload(Student.program),
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments)
    ).all()

    for s in students:
        p_code = s.program.code if s.program else "OTHER"
        if p_code not in program_codes:
            continue
        if not s.fee_demands:
            continue

        demand = s.fee_demands[0]
        calc = calculate_student_financials(demand, demand.payments, current_date=today)
        out_amt = calc["outstanding_amount"]
        due_date = calc["due_date"]

        if out_amt <= Decimal("0.00"):
            continue

        if not due_date or due_date >= today:
            b_key = "Current"
        else:
            overdue_days = (today - due_date).days
            if overdue_days <= 30:
                b_key = "0-30 days"
            elif overdue_days <= 60:
                b_key = "31-60 days"
            else:
                b_key = "60+ days"

        cell_key = f"{p_code}_{b_key}"
        if cell_key in details:
            details[cell_key]["count"] += 1
            details[cell_key]["amount"] += out_amt
            details[cell_key]["student_ids"].append(s.roll_no)

    # Build 2D matrix [program_index][bucket_index]
    matrix = []
    formatted_details = {}
    for p in program_codes:
        row = []
        for b in buckets:
            cell_key = f"{p}_{b}"
            cell_data = details[cell_key]
            row.append(cell_data["count"])
            formatted_details[cell_key] = HeatmapCellDetail(
                count=cell_data["count"],
                amount=float(cell_data["amount"]),
                student_ids=cell_data["student_ids"]
            )
        matrix.append(row)

    return ProgramDefaulterHeatmapResponse(
        programs=program_codes,
        buckets=buckets,
        matrix=matrix,
        details=formatted_details
    )
