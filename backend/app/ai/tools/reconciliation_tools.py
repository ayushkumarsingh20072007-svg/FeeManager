from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.users import User
from app.models.reconciliations import AccountingReconciliation, Mismatch, BankTransaction, Reconciliation
from app.models.enums import UserRole, ReconciliationStatus
from app.services.ledger_calculator import to_decimal

STAFF_ROLES = {
    UserRole.ACCOUNTS_OFFICER,
    UserRole.ADMIN,
    UserRole.MANAGEMENT,
    UserRole.FINANCE_APPROVER,
    UserRole.SYSTEM_ADMIN
}

def _require_staff_role(current_user: User):
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Reconciliation intelligence is restricted to authorized financial officers."
        )

def get_reconciliation_status(
    db: Session,
    current_user: User
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Fetches reconciliation overview, matched vs unmatched counts, variances.
    Restricted to ACCOUNTS_OFFICER, ADMIN, MANAGEMENT, FINANCE_APPROVER.
    """
    _require_staff_role(current_user)

    total_bank_txns = db.query(BankTransaction).count()
    unmatched_bank_txns = db.query(BankTransaction).filter(
        BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED
    ).count()
    matched_bank_txns = db.query(BankTransaction).filter(
        BankTransaction.reconciliation_status == ReconciliationStatus.MATCHED
    ).count()

    open_mismatches = db.query(Mismatch).filter(
        Mismatch.status.in_(["OPEN_INVESTIGATION", "FINANCE_REVIEW_REQUIRED", "PENDING"])
    ).count()

    latest_batch = db.query(AccountingReconciliation).order_by(
        AccountingReconciliation.created_at.desc()
    ).first()

    return {
        "tool": "get_reconciliation_status",
        "total_bank_transactions": total_bank_txns,
        "matched_transactions": matched_bank_txns,
        "unmatched_transactions": unmatched_bank_txns,
        "open_mismatches_count": open_mismatches,
        "latest_batch_code": latest_batch.batch_code if latest_batch else "N/A",
        "fee_system_total": float(to_decimal(latest_batch.fee_system_total)) if latest_batch else 0.0,
        "accounting_system_total": float(to_decimal(latest_batch.accounting_system_total)) if latest_batch else 0.0,
        "net_variance": float(to_decimal(latest_batch.variance_amount)) if latest_batch else 0.0,
        "reconciliation_health": "ACTION_REQUIRED" if open_mismatches > 0 or unmatched_bank_txns > 0 else "RECONCILED"
    }

def get_unmatched_transactions(
    db: Session,
    current_user: User,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Lists unmatched bank feed items requiring reconciliation or investigation.
    """
    _require_staff_role(current_user)

    txns = db.query(BankTransaction).filter(
        BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED
    ).order_by(BankTransaction.transaction_date.desc()).limit(limit).all()

    items = []
    for t in txns:
        items.append({
            "bank_transaction_id": t.bank_transaction_id,
            "amount": float(to_decimal(t.amount)),
            "date": t.transaction_date.isoformat() if t.transaction_date else None,
            "reference_number": t.reference_number or "N/A",
            "bank_reference": t.bank_reference or "N/A",
            "description": t.description or "N/A",
            "status": t.reconciliation_status.value
        })

    return {
        "tool": "get_unmatched_transactions",
        "count": len(items),
        "transactions": items
    }

def get_mismatch_explanations(
    db: Session,
    current_user: User,
    mismatch_id: Optional[str] = None,
    mismatch_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative financial tool: Detailed deterministic explanation of reconciliation exceptions/mismatches.
    """
    _require_staff_role(current_user)

    q = db.query(Mismatch).options(joinedload(Mismatch.student))
    if mismatch_id:
        q = q.filter(Mismatch.id == mismatch_id)
    elif mismatch_code:
        q = q.filter(Mismatch.mismatch_code.ilike(mismatch_code.strip()))
    else:
        # Return all active open mismatches
        mismatches = q.filter(Mismatch.status != "RESOLVED").all()
        items = []
        for m in mismatches:
            items.append({
                "id": m.id,
                "code": m.mismatch_code,
                "category": m.category.value if hasattr(m.category, "value") else str(m.category),
                "transaction_ref": m.transaction_ref,
                "student_roll": m.student.roll_no if m.student else "N/A",
                "expected_amount": float(to_decimal(m.expected_amount)),
                "actual_amount": float(to_decimal(m.actual_amount)),
                "variance": float(to_decimal(m.variance)),
                "status": m.status,
                "flagged_message": m.flagged_message,
                "notes": m.resolution_notes
            })
        return {
            "tool": "get_mismatch_explanations",
            "count": len(items),
            "mismatches": items
        }

    m = q.first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified mismatch record not found.")

    return {
        "tool": "get_mismatch_explanations",
        "id": m.id,
        "code": m.mismatch_code,
        "category": m.category.value if hasattr(m.category, "value") else str(m.category),
        "transaction_ref": m.transaction_ref,
        "student_roll": m.student.roll_no if m.student else "N/A",
        "expected_amount": float(to_decimal(m.expected_amount)),
        "actual_amount": float(to_decimal(m.actual_amount)),
        "variance": float(to_decimal(m.variance)),
        "status": m.status,
        "flagged_message": m.flagged_message,
        "notes": m.resolution_notes
    }
