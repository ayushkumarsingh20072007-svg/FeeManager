from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.users import User, Student
from app.models.reconciliations import BankTransaction, Mismatch
from app.models.enums import UserRole, ReconciliationStatus
from app.schemas.reconciliation import (
    BankTransactionCreate,
    BankTransactionResponse,
    ReconciliationMatchRequest,
    ReconciliationMatchResult,
    MismatchResponse,
    MismatchResolveRequest,
)
from app.services.reconciliation_engine import ReconciliationEngine

router = APIRouter(prefix="/reconciliation", tags=["Bank & Payment Reconciliation"])

def _require_finance_role(user: User):
    allowed_roles = {
        UserRole.ACCOUNTS_OFFICER,
        UserRole.ADMIN,
        UserRole.SYSTEM_ADMIN,
        UserRole.FINANCE_APPROVER,
        UserRole.MANAGEMENT,
    }
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student and Parent roles are not authorized to access reconciliation data."
        )

@router.get("/bank-transactions", response_model=List[BankTransactionResponse])
def list_bank_transactions(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists bank statement feed transactions. Finance/Admin roles only.
    """
    _require_finance_role(current_user)
    query = db.query(BankTransaction)
    if status_filter and status_filter != "ALL":
        query = query.filter(BankTransaction.reconciliation_status == status_filter)
    
    txns = query.order_by(BankTransaction.transaction_date.desc()).all()
    return [
        BankTransactionResponse(
            id=t.id,
            bank_transaction_id=t.bank_transaction_id,
            transaction_date=t.transaction_date,
            value_date=t.value_date,
            amount=t.amount,
            reference_number=t.reference_number,
            bank_reference=t.bank_reference,
            description=t.description,
            account_identifier=t.account_identifier,
            reconciliation_status=t.reconciliation_status.value if hasattr(t.reconciliation_status, "value") else str(t.reconciliation_status),
            matched_payment_id=t.matched_payment_id,
            reconciled_at=t.reconciled_at,
            reconciled_by=t.reconciled_by,
            resolution_notes=t.resolution_notes,
        )
        for t in txns
    ]

@router.post("/bank-transactions", response_model=BankTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_bank_transaction(
    payload: BankTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ingests a single bank statement transaction. Finance/Admin roles only.
    """
    _require_finance_role(current_user)

    existing = db.query(BankTransaction).filter(
        BankTransaction.bank_transaction_id == payload.bank_transaction_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bank transaction '{payload.bank_transaction_id}' already exists."
        )

    txn = BankTransaction(
        bank_transaction_id=payload.bank_transaction_id,
        transaction_date=payload.transaction_date,
        value_date=payload.value_date,
        amount=payload.amount,
        reference_number=payload.reference_number,
        bank_reference=payload.bank_reference,
        description=payload.description,
        account_identifier=payload.account_identifier,
        reconciliation_status=ReconciliationStatus.UNMATCHED,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    return BankTransactionResponse(
        id=txn.id,
        bank_transaction_id=txn.bank_transaction_id,
        transaction_date=txn.transaction_date,
        value_date=txn.value_date,
        amount=txn.amount,
        reference_number=txn.reference_number,
        bank_reference=txn.bank_reference,
        description=txn.description,
        account_identifier=txn.account_identifier,
        reconciliation_status=txn.reconciliation_status.value if hasattr(txn.reconciliation_status, "value") else str(txn.reconciliation_status),
        matched_payment_id=txn.matched_payment_id,
        reconciled_at=txn.reconciled_at,
        reconciled_by=txn.reconciled_by,
        resolution_notes=txn.resolution_notes,
    )

@router.post("/match", response_model=ReconciliationMatchResult)
def run_reconciliation_matching(
    payload: ReconciliationMatchRequest = ReconciliationMatchRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes automated deterministic matching pass against bank statement records.
    """
    _require_finance_role(current_user)
    result = ReconciliationEngine.run_automated_matching(
        db=db,
        current_user=current_user,
        date_tolerance_days=payload.date_tolerance_days,
        dry_run=payload.dry_run,
    )
    return ReconciliationMatchResult(**result)

@router.get("/mismatches", response_model=List[MismatchResponse])
def list_mismatches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists flagged reconciliation mismatches and exceptions.
    """
    _require_finance_role(current_user)
    mismatches = db.query(Mismatch).options(joinedload(Mismatch.student)).order_by(Mismatch.created_at.desc()).all()
    return [
        MismatchResponse(
            id=m.id,
            mismatch_code=m.mismatch_code,
            category=m.category.value if hasattr(m.category, "value") else str(m.category),
            transaction_ref=m.transaction_ref,
            student_id=m.student_id,
            student_roll=m.student.roll_number if m.student else None,
            expected_amount=m.expected_amount,
            actual_amount=m.actual_amount,
            variance=m.variance,
            status=m.status,
            flagged_message=m.flagged_message,
            resolution_notes=m.resolution_notes,
        )
        for m in mismatches
    ]

@router.post("/mismatches/{mismatch_id}/resolve")
def resolve_mismatch_by_id(
    mismatch_id: str,
    payload: MismatchResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Resolves a flagged mismatch or bank exception with mandatory audit remarks.
    """
    _require_finance_role(current_user)
    return ReconciliationEngine.resolve_mismatch(
        mismatch_id=mismatch_id,
        resolution_notes=payload.resolution_notes,
        current_user=current_user,
        db=db,
    )

@router.post("/{id}/resolve")
def resolve_reconciliation_item(
    id: str,
    payload: MismatchResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Convenience alias for resolving mismatch or bank transaction exception.
    """
    _require_finance_role(current_user)
    return ReconciliationEngine.resolve_mismatch(
        mismatch_id=id,
        resolution_notes=payload.resolution_notes,
        current_user=current_user,
        db=db,
    )
