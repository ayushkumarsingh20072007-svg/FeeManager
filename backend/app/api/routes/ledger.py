from typing import List, Dict, Any, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.enums import UserRole
from app.models.users import User, Student, Parent
from app.models.academics import Program, AcademicYear, Category, FeeHead
from app.models.fee_structures import FeeStructure, FeeStructureItem
from app.models.fee_demands import FeeDemand, FeeDemandItem, Scholarship, Concession, FeeWaiver, InstallmentPlan
from app.models.payments import Payment, PaymentAllocation
from app.models.refunds import RefundRequest, RefundPolicy
from app.models.reconciliations import AccountingReconciliation, Mismatch, Reconciliation
from app.models.approvals import ApprovalRequest, ApprovalAction
from app.services.ledger_calculator import calculate_student_financials, to_decimal

router = APIRouter(prefix="/ledger", tags=["Database Ledger Read API"])

@router.get("/stats")
def get_ledger_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Provides authoritative aggregate statistics dynamically calculated from server-scoped student records."""
    q_students = db.query(Student).options(
        joinedload(Student.fee_demands).joinedload(FeeDemand.items),
        joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
        joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
        joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
    )

    q_payments = db.query(Payment)

    # Server-side scoping based strictly on authenticated role and identity
    if current_user.role == UserRole.STUDENT:
        q_students = q_students.filter(Student.user_id == current_user.id)
        student_id = current_user.student_profile.id if current_user.student_profile else None
        q_payments = q_payments.filter(Payment.student_id == student_id)
    elif current_user.role == UserRole.PARENT:
        parent_id = current_user.parent_profile.id if current_user.parent_profile else None
        q_students = q_students.filter(Student.parent_id == parent_id)
        q_payments = q_payments.join(Student).filter(Student.parent_id == parent_id)

    students = q_students.all()
    total_students = len(students)
    total_demand = Decimal("0.00")
    total_net_demand = Decimal("0.00")
    total_paid = Decimal("0.00")
    total_outstanding = Decimal("0.00")
    overdue_90plus = Decimal("0.00")

    paid_students = 0
    partially_paid_students = 0
    unpaid_students = 0
    overdue_students = 0

    today = date.today()

    for s in students:
        latest_demand = s.fee_demands[0] if s.fee_demands else None
        payments = latest_demand.payments if (latest_demand and latest_demand.payments) else []
        calc = calculate_student_financials(latest_demand, payments, today)

        total_demand += calc["gross_demand"]
        total_net_demand += calc["net_demand"]
        total_paid += calc["paid_amount"]
        total_outstanding += calc["outstanding_amount"]

        st = calc["status"]
        if st == "OVERDUE":
            overdue_students += 1
            if latest_demand and latest_demand.due_date:
                days_overdue = (today - latest_demand.due_date).days
                if days_overdue >= 90:
                    overdue_90plus += calc["outstanding_amount"]
        elif st == "PAID":
            paid_students += 1
        elif st == "PARTIALLY_PAID":
            partially_paid_students += 1
        else:
            unpaid_students += 1

    payments = q_payments.all()
    total_payments = len(payments)
    reconciled_payments = sum(1 for p in payments if p.status.value == "RECONCILED")
    unreconciled_payments = total_payments - reconciled_payments

    if current_user.role in (UserRole.STUDENT, UserRole.PARENT):
        mismatches = 0
        pending_approvals = 0
        pending_refunds = 0
    else:
        mismatches = db.query(Mismatch).count()
        pending_approvals = db.query(ApprovalRequest).filter(ApprovalRequest.status == "PENDING").count()
        pending_refunds = db.query(RefundRequest).filter(RefundRequest.status == "PENDING_APPROVAL").count()

    collection_pct = round(float((total_paid / total_net_demand * 100) if total_net_demand > Decimal("0.00") else 0), 1)

    return {
        "total_students": total_students,
        "total_demand": float(total_demand),
        "total_net_demand": float(total_net_demand),
        "total_collected": float(total_paid),
        "total_outstanding": float(total_outstanding),
        "overdue_90plus": float(overdue_90plus),
        "paid_students": paid_students,
        "partially_paid_students": partially_paid_students,
        "unpaid_students": unpaid_students,
        "overdue_students": overdue_students,
        "total_payments": total_payments,
        "reconciled_payments": reconciled_payments,
        "unreconciled_payments": unreconciled_payments,
        "mismatches": mismatches,
        "pending_approvals": pending_approvals,
        "pending_refunds": pending_refunds,
        "collection_percentage": collection_pct
    }

@router.get("/students")
def get_students(
    search: Optional[str] = Query(None),
    program: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Lists students with server-side RBAC scoping and authoritative calculated financial metrics."""
    q = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.program),
        joinedload(Student.category),
        joinedload(Student.admission_year),
        joinedload(Student.fee_demands).joinedload(FeeDemand.items),
        joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
        joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
        joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
    )

    # Strict server-side scoping
    if current_user.role == UserRole.STUDENT:
        q = q.filter(Student.user_id == current_user.id)
    elif current_user.role == UserRole.PARENT:
        parent_id = current_user.parent_profile.id if current_user.parent_profile else None
        q = q.filter(Student.parent_id == parent_id)

    if program:
        q = q.join(Program).filter(Program.code == program)
    
    students = q.offset(offset).limit(limit).all()
    results = []
    today = date.today()

    for s in students:
        if search:
            search_lower = search.lower()
            name_match = s.user and search_lower in s.user.full_name.lower()
            roll_match = search_lower in s.roll_no.lower()
            if not (name_match or roll_match):
                continue

        latest_demand = s.fee_demands[0] if s.fee_demands else None
        payments = latest_demand.payments if (latest_demand and latest_demand.payments) else []
        calc = calculate_student_financials(latest_demand, payments, today)

        results.append({
            "id": s.id,
            "roll_no": s.roll_no,
            "name": s.user.full_name if s.user else "N/A",
            "email": s.user.email if s.user else "N/A",
            "program_code": s.program.code if s.program else "N/A",
            "program_name": s.program.name if s.program else "N/A",
            "academic_year": s.admission_year.year_code if s.admission_year else "N/A",
            "category": s.category.code if s.category else "GEN",
            "semester": s.current_semester,
            "enrollment_status": s.enrollment_status,
            "gross_demand": float(calc["gross_demand"]),
            "scholarship_amount": float(calc["scholarship_amount"]),
            "concession_amount": float(calc["concession_amount"]),
            "waiver_amount": float(calc["waiver_amount"]),
            "net_demand": float(calc["net_demand"]),
            "paid_amount": float(calc["paid_amount"]),
            "outstanding_amount": float(calc["outstanding_amount"]),
            "demand_status": calc["status"],
            "due_date": str(calc["due_date"]) if calc["due_date"] else "N/A",
        })
    return results

@router.get("/students/{student_id}")
def get_student_by_id(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Retrieves authoritative student ledger details with strict direct-ID ownership protection."""
    s = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.program),
        joinedload(Student.category),
        joinedload(Student.admission_year),
        joinedload(Student.fee_demands).joinedload(FeeDemand.items),
        joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
        joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
        joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
        joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
    ).filter(Student.id == student_id).first()

    # Enforce strict server-side authorization
    if current_user.role == UserRole.STUDENT:
        if not (s and (s.user_id == current_user.id or (current_user.student_profile and current_user.student_profile.id == student_id))):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this student record."
            )
    elif current_user.role == UserRole.PARENT:
        parent_id = current_user.parent_profile.id if current_user.parent_profile else None
        if not (s and s.parent_id == parent_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this student record."
            )

    if not s:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found."
        )

    latest_demand = s.fee_demands[0] if s.fee_demands else None
    payments = latest_demand.payments if (latest_demand and latest_demand.payments) else []
    calc = calculate_student_financials(latest_demand, payments, date.today())

    return {
        "id": s.id,
        "roll_no": s.roll_no,
        "name": s.user.full_name if s.user else "N/A",
        "email": s.user.email if s.user else "N/A",
        "program_code": s.program.code if s.program else "N/A",
        "program_name": s.program.name if s.program else "N/A",
        "academic_year": s.admission_year.year_code if s.admission_year else "N/A",
        "category": s.category.code if s.category else "GEN",
        "semester": s.current_semester,
        "enrollment_status": s.enrollment_status,
        "gross_demand": float(calc["gross_demand"]),
        "scholarship_amount": float(calc["scholarship_amount"]),
        "concession_amount": float(calc["concession_amount"]),
        "waiver_amount": float(calc["waiver_amount"]),
        "net_demand": float(calc["net_demand"]),
        "paid_amount": float(calc["paid_amount"]),
        "outstanding_amount": float(calc["outstanding_amount"]),
        "demand_status": calc["status"],
        "due_date": str(calc["due_date"]) if calc["due_date"] else "N/A",
    }

@router.get("/fee-structures")
def get_fee_structures(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    structures = db.query(FeeStructure).options(
        joinedload(FeeStructure.program),
        joinedload(FeeStructure.academic_year),
        joinedload(FeeStructure.category),
        joinedload(FeeStructure.admission_route),
        joinedload(FeeStructure.regulation),
        joinedload(FeeStructure.items).joinedload(FeeStructureItem.fee_head)
    ).all()

    res = []
    for fs in structures:
        res.append({
            "id": fs.id,
            "academic_year": fs.academic_year.year_code if fs.academic_year else "2026-27",
            "program_code": fs.program.code if fs.program else "N/A",
            "program_name": fs.program.name if fs.program else "N/A",
            "regulation": fs.regulation.code if fs.regulation else "R23",
            "category": fs.category.name if fs.category else "General",
            "admission_route": fs.admission_route.code if fs.admission_route else "EAMCET",
            "version": fs.version,
            "status": fs.status.value,
            "total_amount": fs.total_amount,
            "effective_from": str(fs.effective_from),
            "effective_to": str(fs.effective_to) if fs.effective_to else None,
            "items": [
                {
                    "head_code": it.fee_head.code if it.fee_head else "OTHER",
                    "head_name": it.fee_head.name if it.fee_head else "Fee Head",
                    "amount": it.amount,
                    "priority": it.priority_order,
                    "is_refundable": it.is_refundable
                }
                for it in fs.items
            ]
        })
    return res

@router.get("/payments")
def get_payments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Lists payment transactions with strict role-based data isolation."""
    q = db.query(Payment).options(
        joinedload(Payment.student).joinedload(Student.user),
        joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head)
    )

    if current_user.role == UserRole.STUDENT:
        student_id = current_user.student_profile.id if current_user.student_profile else None
        q = q.filter(Payment.student_id == student_id)
    elif current_user.role == UserRole.PARENT:
        parent_id = current_user.parent_profile.id if current_user.parent_profile else None
        q = q.join(Student).filter(Student.parent_id == parent_id)

    payments = q.order_by(Payment.payment_date.desc()).all()

    res = []
    for p in payments:
        res.append({
            "id": p.id,
            "payment_ref": p.payment_ref,
            "student_roll": p.student.roll_no if p.student else "N/A",
            "student_name": p.student.user.full_name if (p.student and p.student.user) else "N/A",
            "amount": p.amount,
            "channel": p.channel.value,
            "status": p.status.value,
            "transaction_id": p.transaction_id or p.utr_number or p.receipt_number or "-",
            "payment_date": str(p.payment_date),
            "gateway_name": p.gateway_name or p.channel.value,
            "notes": p.notes or ""
        })
    return res

@router.get("/mismatches")
def get_mismatches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    # Restricted to finance & administrative roles
    if current_user.role in (UserRole.STUDENT, UserRole.PARENT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting reconciliation mismatches."
        )

    mismatches = db.query(Mismatch).options(
        joinedload(Mismatch.student).joinedload(Student.user)
    ).all()

    res = []
    for m in mismatches:
        res.append({
            "id": m.id,
            "mismatch_code": m.mismatch_code,
            "category": m.category.value,
            "transaction_ref": m.transaction_ref,
            "student_roll": m.student.roll_no if m.student else "-",
            "expected_amount": m.expected_amount,
            "actual_amount": m.actual_amount,
            "variance": m.variance,
            "status": m.status,
            "flagged_message": m.flagged_message
        })
    return res

@router.get("/approvals")
def get_approvals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    if current_user.role in (UserRole.STUDENT, UserRole.PARENT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to institutional approval requests."
        )

    approvals = db.query(ApprovalRequest).options(
        joinedload(ApprovalRequest.requested_by)
    ).all()

    res = []
    for a in approvals:
        res.append({
            "id": a.id,
            "approval_code": a.approval_code,
            "approval_type": a.approval_type.value,
            "entity_type": a.entity_type,
            "requested_by": a.requested_by.full_name if a.requested_by else "Accounts Officer",
            "requested_amount": a.requested_amount,
            "status": a.status.value,
            "reason": a.reason,
            "created_at": str(a.created_at)
        })
    return res

@router.get("/refunds")
def get_refunds(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    if current_user.role in (UserRole.STUDENT, UserRole.PARENT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to institutional refund claims."
        )

    refunds = db.query(RefundRequest).options(
        joinedload(RefundRequest.student).joinedload(Student.user),
        joinedload(RefundRequest.policy)
    ).all()

    res = []
    for r in refunds:
        res.append({
            "id": r.id,
            "request_code": r.request_code,
            "student_roll": r.student.roll_no if r.student else "-",
            "student_name": r.student.user.full_name if (r.student and r.student.user) else "-",
            "policy_name": r.policy.policy_name if r.policy else "Standard Policy",
            "withdrawal_date": str(r.withdrawal_date),
            "total_paid": r.total_paid,
            "non_refundable": r.non_refundable_amount,
            "policy_deduction": r.policy_deduction_amount,
            "proposed_refund": r.proposed_refund_amount,
            "status": r.status.value,
            "reason": r.reason
        })
    return res
