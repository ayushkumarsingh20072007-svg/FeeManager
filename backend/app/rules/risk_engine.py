"""
Deterministic, Explainable Default-Risk Prediction Engine.
Architectural Pillar: "RULES CALCULATE" - 100% deterministic, audit-compliant, zero black-box ML.

Calculates default risk score (0-100) using 5 weighted factors:
1. Past Payment Delay Pattern (30% weight, max 30 pts)
2. Current Aging Bucket (25% weight, max 25 pts)
3. Partial Payment Ratio (20% weight, max 20 pts)
4. Installment Plan Adherence (15% weight, max 15 pts)
5. Category / Scholarship Dependency (10% weight, max 10 pts)
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.users import Student
from app.models.fee_demands import FeeDemand
from app.services.ledger_calculator import calculate_student_financials, to_decimal

TWO_PLACES = Decimal("0.01")

def calculate_default_risk(
    student_or_id: Any,
    db: Optional[Session] = None,
    reference_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    Computes a 0-100 risk score for a student using deterministic weighted factors.
    Every factor contribution and human-readable explanation is returned for auditability.
    
    Accepts either a Student model instance or a student_id / roll_no string.
    """
    if reference_date is None:
        reference_date = date.today()

    student = None
    if isinstance(student_or_id, Student):
        student = student_or_id
    elif isinstance(student_or_id, str) and db is not None:
        # Search by student ID or roll number
        student = db.query(Student).filter(
            (Student.id == student_or_id) | (Student.roll_no == student_or_id)
        ).first()

    if not student:
        raise ValueError(f"Student '{student_or_id}' not found in financial system.")

    fee_demands = getattr(student, "fee_demands", [])
    if not fee_demands and db is not None:
        fee_demands = db.query(FeeDemand).filter(FeeDemand.student_id == student.id).all()

    roll_no = getattr(student, "roll_no", "")
    student_id = getattr(student, "id", "")
    full_name = student.user.full_name if (hasattr(student, "user") and student.user) else ""
    program_code = student.program.code if (hasattr(student, "program") and student.program) else ""

    # Default result for students with no active fee demands
    if not fee_demands:
        factors = [
            {"factor": "Past Payment Delay Pattern", "points": 0, "max_points": 30, "explanation": "No fee demands on record; zero delay risk."},
            {"factor": "Current Aging Bucket", "points": 0, "max_points": 25, "explanation": "No outstanding fee demands."},
            {"factor": "Partial Payment Ratio", "points": 0, "max_points": 20, "explanation": "No active fee demand amount."},
            {"factor": "Installment Plan Adherence", "points": 0, "max_points": 15, "explanation": "No installment plan configured."},
            {"factor": "Category / Scholarship Dependency", "points": 0, "max_points": 10, "explanation": "No active scholarship dependency."}
        ]
        return {
            "student_id": student_id,
            "roll_no": roll_no,
            "student_name": full_name,
            "program_code": program_code,
            "risk_score": 0,
            "risk_tier": "LOW",
            "contributing_factors": factors,
            "calculated_at": reference_date.isoformat()
        }

    latest_demand = fee_demands[0]
    payments = getattr(latest_demand, "payments", []) or []
    calc = calculate_student_financials(latest_demand, payments, reference_date)

    net_demand = calc["net_demand"]
    paid_amount = calc["paid_amount"]
    outstanding_amount = calc["outstanding_amount"]
    due_date = calc["due_date"]
    is_overdue = calc["is_overdue"]

    # Rule 0: Fully Paid Student -> Total Risk Score is 0 (LOW)
    if outstanding_amount <= Decimal("0.00"):
        factors = [
            {"factor": "Past Payment Delay Pattern", "points": 0, "max_points": 30, "explanation": "Account balance is fully paid; no delay risk."},
            {"factor": "Current Aging Bucket", "points": 0, "max_points": 25, "explanation": "Account balance is 100% cleared."},
            {"factor": "Partial Payment Ratio", "points": 0, "max_points": 20, "explanation": "Net demand is 100% paid."},
            {"factor": "Installment Plan Adherence", "points": 0, "max_points": 15, "explanation": "No active installment default risk."},
            {"factor": "Category / Scholarship Dependency", "points": 0, "max_points": 10, "explanation": "No scholarship dependency risk."}
        ]
        return {
            "student_id": student_id,
            "roll_no": roll_no,
            "student_name": full_name,
            "program_code": program_code,
            "risk_score": 0,
            "risk_tier": "LOW",
            "contributing_factors": factors,
            "calculated_at": reference_date.isoformat()
        }

    overdue_days = 0
    days_to_due = 0
    if due_date:
        if reference_date > due_date:
            overdue_days = (reference_date - due_date).days
        else:
            days_to_due = (due_date - reference_date).days

    factors = []

    # 1. Past payment delay pattern (Max 30 pts)
    delay_pts = Decimal("0")
    days_late_list = []
    for p in payments:
        p_date = getattr(p, "payment_date", None) or getattr(p, "created_at", None)
        if p_date and hasattr(p_date, "date"):
            p_date = p_date.date()
        if p_date and due_date and p_date > due_date:
            days_late_list.append((p_date - due_date).days)

    if days_late_list:
        avg_late = sum(days_late_list) / len(days_late_list)
        if avg_late > 30:
            delay_pts = Decimal("30")
        elif avg_late > 15:
            delay_pts = Decimal("20")
        elif avg_late > 0:
            delay_pts = Decimal("10")
        delay_explanation = f"Historical payment delay averages {avg_late:.0f} days late."
    elif overdue_days > 0:
        if overdue_days > 30:
            delay_pts = Decimal("30")
        elif overdue_days > 15:
            delay_pts = Decimal("20")
        else:
            delay_pts = Decimal("10")
        delay_explanation = f"Current payment is {overdue_days} days late."
    else:
        delay_explanation = "No prior payment delays detected."

    factors.append({
        "factor": "Past Payment Delay Pattern",
        "points": int(delay_pts),
        "max_points": 30,
        "explanation": delay_explanation
    })

    # 2. Current Aging Bucket (Max 25 pts)
    aging_pts = Decimal("0")
    if is_overdue:
        if overdue_days > 60:
            aging_pts = Decimal("25")
            aging_explanation = f"Critical overdue status ({overdue_days} days overdue)."
        elif overdue_days > 30:
            aging_pts = Decimal("20")
            aging_explanation = f"Severe overdue status in 31-60 days bucket ({overdue_days} days)."
        else:
            aging_pts = Decimal("15")
            aging_explanation = f"Recent overdue status in 1-30 days bucket ({overdue_days} days)."
    else:
        if days_to_due <= 15:
            aging_pts = Decimal("12")
            aging_explanation = f"Payment deadline approaching within {days_to_due} days."
        elif days_to_due <= 30:
            aging_pts = Decimal("8")
            aging_explanation = f"Payment due in {days_to_due} days."
        elif days_to_due <= 60:
            aging_pts = Decimal("4")
            aging_explanation = f"Payment due in {days_to_due} days."
        else:
            aging_explanation = f"Payment due in {days_to_due} days (low urgency)."

    factors.append({
        "factor": "Current Aging Bucket",
        "points": int(aging_pts),
        "max_points": 25,
        "explanation": aging_explanation
    })

    # 3. Partial Payment Ratio (Max 20 pts)
    ratio_pts = Decimal("0")
    if net_demand > 0:
        paid_ratio = paid_amount / net_demand
        unpaid_ratio = Decimal("1") - paid_ratio
        ratio_pts = (Decimal("20") * unpaid_ratio).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        pct_paid = float(paid_ratio * 100)
        ratio_explanation = f"Only {pct_paid:.1f}% of net demand paid to date."
    else:
        ratio_explanation = "Net demand is zero."

    factors.append({
        "factor": "Partial Payment Ratio",
        "points": int(ratio_pts),
        "max_points": 20,
        "explanation": ratio_explanation
    })

    # 4. Installment Plan Adherence (Max 15 pts)
    inst_pts = Decimal("0")
    inst_plan = getattr(latest_demand, "installment_plan", None)
    if inst_plan and getattr(inst_plan, "installments", None):
        total_tranches = len(inst_plan.installments)
        overdue_tranches = 0
        for inst in inst_plan.installments:
            if inst.status == "OVERDUE" or (inst.due_date < reference_date and inst.paid_amount < inst.amount):
                overdue_tranches += 1
        if overdue_tranches > 0:
            raw_pts = (Decimal("15") * Decimal(overdue_tranches) / Decimal(total_tranches)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
            inst_pts = min(Decimal("15"), raw_pts)
            inst_explanation = f"{overdue_tranches} of {total_tranches} installment tranches overdue."
        else:
            inst_explanation = f"All {total_tranches} installment tranches up to date."
    elif is_overdue:
        if paid_amount == 0:
            inst_pts = Decimal("15")
            inst_explanation = "Lump-sum payment is overdue with 0 installments paid."
        else:
            inst_pts = Decimal("10")
            inst_explanation = "Lump-sum payment is partially paid and overdue."
    else:
        if paid_amount == 0 and days_to_due <= 30:
            inst_pts = Decimal("8")
            inst_explanation = "Zero payment made for lump-sum demand due within 30 days."
        elif paid_amount < (net_demand * Decimal("0.5")) and days_to_due <= 30:
            inst_pts = Decimal("5")
            inst_explanation = "Less than 50% paid for lump-sum demand due within 30 days."
        else:
            inst_explanation = "No installment plan default risks."

    factors.append({
        "factor": "Installment Plan Adherence",
        "points": int(inst_pts),
        "max_points": 15,
        "explanation": inst_explanation
    })

    # 5. Category / Scholarship Dependency (Max 10 pts)
    scholar_pts = Decimal("0")
    scholarships = getattr(latest_demand, "scholarships", []) or getattr(student, "scholarships", []) or []
    active_scholarships = [s for s in scholarships if getattr(s, "status", "APPLIED") in ("APPLIED", "APPROVED")]

    category_code = student.category.code if (hasattr(student, "category") and student.category) else ""

    if active_scholarships:
        sch_amt = sum(to_decimal(s.amount) for s in active_scholarships)
        if paid_amount < (net_demand * Decimal("0.5")):
            scholar_pts = Decimal("10")
            scholar_explanation = f"Awaiting scholarship disbursement (INR {sch_amt:,.0f}) with low direct payments."
        else:
            scholar_pts = Decimal("5")
            scholar_explanation = f"Active scholarship (INR {sch_amt:,.0f}) with partial direct payments."
    elif category_code in ("SC", "ST", "OBC") and paid_amount == 0:
        scholar_pts = Decimal("5")
        scholar_explanation = f"Category ({category_code}) student with 0 initial payment recorded."
    else:
        scholar_explanation = "No scholarship dependency risk."

    factors.append({
        "factor": "Category / Scholarship Dependency",
        "points": int(scholar_pts),
        "max_points": 10,
        "explanation": scholar_explanation
    })

    # Sum of factors equals total risk score
    total_score = sum(f["points"] for f in factors)
    total_score = max(0, min(100, total_score))

    if total_score <= 30:
        tier = "LOW"
    elif total_score <= 60:
        tier = "MEDIUM"
    else:
        tier = "HIGH"

    return {
        "student_id": student_id,
        "roll_no": roll_no,
        "student_name": full_name,
        "program_code": program_code,
        "risk_score": total_score,
        "risk_tier": tier,
        "contributing_factors": factors,
        "calculated_at": reference_date.isoformat()
    }


def get_cohort_default_risk(
    db: Session,
    program_code: Optional[str] = None,
    min_score: int = 61,
    reference_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    """
    Returns risk scores for all matching cohort students, sorted descending by score.
    """
    query = db.query(Student)
    if program_code:
        query = query.join(Student.program).filter(
            (Student.program.has(code=program_code)) | (Student.program.has(id=program_code))
        )
    
    students = query.all()
    results = [
        calculate_default_risk(student_or_id=s, db=db, reference_date=reference_date)
        for s in students
    ]
    
    # Filter by minimum score and sort descending
    filtered = [r for r in results if r["risk_score"] >= min_score]
    filtered.sort(key=lambda x: x["risk_score"], reverse=True)
    return filtered
