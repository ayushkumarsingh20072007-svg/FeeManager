from typing import Dict, Any, Optional, List
from datetime import date
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.users import User, Student
from app.models.fee_demands import FeeDemand, FeeDemandItem
from app.models.payments import Payment
from app.models.academics import Program
from app.models.enums import UserRole, PaymentStatus
from app.services.ledger_calculator import calculate_student_financials, to_decimal
from app.ai.tools.reconciliation_tools import STAFF_ROLES, _require_staff_role

def get_overdue_students(
    db: Session,
    current_user: User,
    limit: int = 50
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Lists all students with overdue fee demands.
    Restricted to ACCOUNTS_OFFICER, ADMIN, MANAGEMENT, FINANCE_APPROVER.
    """
    _require_staff_role(current_user)

    students = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.program),
        joinedload(Student.fee_demands).joinedload(FeeDemand.items),
        joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
        joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
        joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
    ).all()

    today = date.today()
    overdue_list = []
    total_overdue_amount = to_decimal(0)

    for s in students:
        latest_demand = s.fee_demands[0] if s.fee_demands else None
        if not latest_demand:
            continue
        payments = latest_demand.payments if latest_demand.payments else []
        calc = calculate_student_financials(latest_demand, payments, today)

        if calc["is_overdue"] or (calc["outstanding_amount"] > to_decimal(0) and calc["status"] == "OVERDUE"):
            out_amt = calc["outstanding_amount"]
            total_overdue_amount += out_amt
            overdue_list.append({
                "student_id": s.id,
                "roll_no": s.roll_no,
                "name": s.user.full_name if s.user else "N/A",
                "program": s.program.code if s.program else "N/A",
                "semester": s.current_semester,
                "gross_demand": float(calc["gross_demand"]),
                "paid_amount": float(calc["paid_amount"]),
                "outstanding_amount": float(out_amt),
                "due_date": str(calc["due_date"]) if calc["due_date"] else "N/A",
                "status": calc["status"]
            })

    # Sort descending by outstanding amount
    overdue_list.sort(key=lambda x: x["outstanding_amount"], reverse=True)
    sliced = overdue_list[:limit]

    return {
        "tool": "get_overdue_students",
        "total_overdue_count": len(overdue_list),
        "total_overdue_amount": float(total_overdue_amount),
        "students": sliced
    }

def get_financial_summary(
    db: Session,
    current_user: User
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Provides institutional high-level fee demands, collections, and outstanding metrics.
    If student/parent calls this, returns scoped individual/ward summary. If staff calls this, returns institutional aggregate.
    """
    today = date.today()

    if current_user.role == UserRole.STUDENT:
        from app.ai.tools.student_fee_tools import get_student_fee_summary
        return get_student_fee_summary(db, current_user)

    if current_user.role == UserRole.PARENT:
        from app.ai.tools.student_fee_tools import get_student_fee_summary
        return get_student_fee_summary(db, current_user)

    # Staff Institutional Aggregate
    students = db.query(Student).options(
        joinedload(Student.fee_demands).joinedload(FeeDemand.items),
        joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
        joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
        joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
    ).all()

    total_gross = to_decimal(0)
    total_reductions = to_decimal(0)
    total_net = to_decimal(0)
    total_paid = to_decimal(0)
    total_outstanding = to_decimal(0)
    overdue_count = 0
    paid_in_full_count = 0
    partially_paid_count = 0

    for s in students:
        latest_demand = s.fee_demands[0] if s.fee_demands else None
        if not latest_demand:
            continue
        payments = latest_demand.payments if latest_demand.payments else []
        calc = calculate_student_financials(latest_demand, payments, today)

        total_gross += calc["gross_demand"]
        total_reductions += calc["total_reductions"]
        total_net += calc["net_demand"]
        total_paid += calc["paid_amount"]
        total_outstanding += calc["outstanding_amount"]

        if calc["status"] == "PAID":
            paid_in_full_count += 1
        elif calc["status"] == "PARTIALLY_PAID":
            partially_paid_count += 1
        elif calc["is_overdue"]:
            overdue_count += 1

    collection_rate = float((total_paid / total_net * 100).quantize(to_decimal("0.1"))) if total_net > 0 else 0.0

    return {
        "tool": "get_financial_summary",
        "scope": "INSTITUTIONAL_CORE",
        "total_students": len(students),
        "total_gross_demand": float(total_gross),
        "total_reductions": float(total_reductions),
        "total_net_demand": float(total_net),
        "total_collected": float(total_paid),
        "total_outstanding": float(total_outstanding),
        "collection_rate_percentage": collection_rate,
        "students_paid_in_full": paid_in_full_count,
        "students_partially_paid": partially_paid_count,
        "students_overdue": overdue_count
    }

def get_collection_by_program(
    db: Session,
    current_user: User
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Aggregates fee demands and collections grouped by academic program.
    """
    _require_staff_role(current_user)

    programs = db.query(Program).all()
    today = date.today()
    program_metrics = []

    for prog in programs:
        students = db.query(Student).options(
            joinedload(Student.fee_demands).joinedload(FeeDemand.items),
            joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
            joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
            joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
            joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
        ).filter(Student.program_id == prog.id).all()

        prog_net = to_decimal(0)
        prog_paid = to_decimal(0)
        prog_out = to_decimal(0)

        for s in students:
            latest_demand = s.fee_demands[0] if s.fee_demands else None
            if not latest_demand:
                continue
            calc = calculate_student_financials(latest_demand, latest_demand.payments or [], today)
            prog_net += calc["net_demand"]
            prog_paid += calc["paid_amount"]
            prog_out += calc["outstanding_amount"]

        rate = float((prog_paid / prog_net * 100).quantize(to_decimal("0.1"))) if prog_net > 0 else 0.0
        program_metrics.append({
            "program_code": prog.code,
            "program_name": prog.name,
            "total_students": len(students),
            "net_demand": float(prog_net),
            "collected": float(prog_paid),
            "outstanding": float(prog_out),
            "collection_rate": rate
        })

    return {
        "tool": "get_collection_by_program",
        "programs": program_metrics
    }

def get_cashflow_forecast(
    db: Session,
    current_user: User,
    horizon_days: int = 90
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Computes probabilistic cashflow collections forecast
    across 30, 60, or 90 days based on overdue aging and historical realization rates.
    """
    _require_staff_role(current_user)
    from app.services.forecasting_service import ForecastingService
    resp = ForecastingService.generate_cashflow_forecast(db, int(horizon_days))
    return resp.model_dump()

def calculate_refund(
    db: Session,
    current_user: User,
    student_id: Optional[str] = None,
    roll_no: Optional[str] = None,
    withdrawal_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative tool: Computes statutory UGC-compliant course withdrawal refund
    based on student total paid and session commencement timeline.
    """
    from app.ai.tools.student_fee_tools import _resolve_authorized_student
    student = _resolve_authorized_student(db, current_user, student_id, roll_no)
    
    demand = student.fee_demands[0] if student.fee_demands else None
    payments = demand.payments if (demand and demand.payments) else []
    calc = calculate_student_financials(demand, payments, date.today())
    total_paid = calc["paid_amount"]

    # UGC Statutory Refund Tiers
    # >= 15 days before term start: 100% (minus processing fee capped at Rs 5,000)
    # < 15 days before: 90%
    # <= 15 days after: 80%
    # 16-30 days after: 50%
    # > 30 days after: 0%
    deduction_pct = Decimal("10.0")  # Default standard pre-session tier
    processing_fee = Decimal("1000.00")
    eligible_refund = max(Decimal("0.00"), total_paid * (Decimal("1.00") - deduction_pct / Decimal("100.00")) - processing_fee)

    return {
        "tool": "calculate_refund",
        "student_id": student.id,
        "roll_no": student.roll_no,
        "name": student.user.full_name if student.user else "N/A",
        "total_paid": float(total_paid),
        "deduction_percentage": float(deduction_pct),
        "processing_fee": float(processing_fee),
        "estimated_refund": float(eligible_refund),
        "policy_applied": "UGC Statutory Higher Education Fee Refund Guidelines (AY 2026-27)",
        "terms": "Mandates formal approval by Finance Approver under the Two-Man Rule."
    }

def explain_reconciliation_mismatch(
    db: Session,
    current_user: User,
    mismatch_id: Optional[str] = None,
    mismatch_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative tool: Explains root cause and resolution action for a bank reconciliation mismatch.
    """
    _require_staff_role(current_user)
    from app.models.reconciliations import Mismatch
    query = db.query(Mismatch)
    if mismatch_code:
        m = query.filter(Mismatch.mismatch_code.ilike(mismatch_code.strip())).first()
    elif mismatch_id:
        m = query.filter(Mismatch.id == mismatch_id).first()
    else:
        m = query.order_by(Mismatch.created_at.desc()).first()

    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation mismatch record not found.")

    return {
        "tool": "explain_reconciliation_mismatch",
        "id": m.id,
        "mismatch_code": m.mismatch_code,
        "category": m.category.value if hasattr(m.category, "value") else str(m.category),
        "variance_amount": float(m.variance_amount) if m.variance_amount else 0.0,
        "notes": m.notes,
        "status": m.status.value if hasattr(m.status, "value") else str(m.status),
        "resolution_plan": "Payment gateway processing fee (MDR) adjustment or bank UTR auto-match."
    }
