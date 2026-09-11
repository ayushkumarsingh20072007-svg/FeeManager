"""
Deterministic Bank Reconciliation Engine for Agent 40 — Phase 3.
Implements a 4-tier matching hierarchy:
1. Exact Transaction ID / UTR Number match
2. Exact Payment Reference match
3. Single candidate Amount + Date window match
4. Multi-candidate Ambiguity -> EXCEPTION (Strict zero-guesswork policy)

Preserves intentional test mismatches (MIS-2026-001, MIS-2026-002, MIS-2026-003).
"""
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.enums import (
    ReconciliationStatus,
    PaymentStatus,
    MismatchCategory,
    AuditAction,
    UserRole,
)
from app.models.users import User
from app.models.payments import Payment
from app.models.reconciliations import BankTransaction, Mismatch, Reconciliation
from app.services.ledger_calculator import to_decimal
from app.services.audit_service import AuditService

class ReconciliationEngine:

    @classmethod
    def run_automated_matching(
        cls,
        db: Session,
        current_user: User,
        date_tolerance_days: int = 3,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes deterministic automated matching pass on all UNMATCHED bank transactions.
        """
        # Fetch unmatched bank transactions
        bank_txns = db.query(BankTransaction).filter(
            BankTransaction.reconciliation_status.in_([
                ReconciliationStatus.UNMATCHED,
                ReconciliationStatus.UNRECONCILED,
            ])
        ).all()

        # Fetch unreconciled received payments
        unreconciled_payments = db.query(Payment).filter(
            Payment.status.in_([
                PaymentStatus.RECEIVED,
                PaymentStatus.PENDING,
                PaymentStatus.PARTIALLY_RECONCILED,
            ])
        ).all()

        matched_count = 0
        exception_count = 0
        unmatched_count = 0
        details: List[Dict[str, Any]] = []

        now = datetime.now(timezone.utc)

        for b_txn in bank_txns:
            b_amt = to_decimal(b_txn.amount)
            b_ref = (b_txn.reference_number or "").strip()
            b_bank_ref = (b_txn.bank_reference or "").strip()
            b_desc = (b_txn.description or "").strip()
            b_date = b_txn.transaction_date.date() if hasattr(b_txn.transaction_date, "date") else b_txn.transaction_date

            matched_payment: Optional[Payment] = None
            match_tier: Optional[str] = None
            is_exception = False
            exception_reason = ""

            # Tier 1: Exact UTR or Transaction ID match
            if b_ref:
                for p in unreconciled_payments:
                    p_amt = to_decimal(p.amount)
                    if (p.utr_number and p.utr_number.strip() == b_ref) or \
                       (p.transaction_id and p.transaction_id.strip() == b_ref):
                        if p_amt == b_amt:
                            matched_payment = p
                            match_tier = "TIER_1_EXACT_UTR_TXN_MATCH"
                            break
                        else:
                            is_exception = True
                            exception_reason = f"Reference matches {p.payment_ref} but amounts differ (Bank: ₹{b_amt}, System: ₹{p_amt})"
                            break

            # Tier 2: Exact Payment Reference in Description or Bank Ref
            if not matched_payment and not is_exception:
                for p in unreconciled_payments:
                    if p.payment_ref in b_desc or (b_bank_ref and p.payment_ref == b_bank_ref):
                        p_amt = to_decimal(p.amount)
                        if p_amt == b_amt:
                            matched_payment = p
                            match_tier = "TIER_2_EXACT_PAYMENT_REF_MATCH"
                            break
                        else:
                            is_exception = True
                            exception_reason = f"Payment ref {p.payment_ref} in narration but amount mismatch (Bank: ₹{b_amt}, System: ₹{p_amt})"
                            break

            # Tier 3: Amount + Date Tolerance Match (Single candidate only)
            if not matched_payment and not is_exception:
                candidates: List[Payment] = []
                for p in unreconciled_payments:
                    p_amt = to_decimal(p.amount)
                    if p_amt == b_amt:
                        p_date = p.payment_date.date() if hasattr(p.payment_date, "date") else p.payment_date
                        diff_days = abs((p_date - b_date).days)
                        if diff_days <= date_tolerance_days:
                            candidates.append(p)

                if len(candidates) == 1:
                    matched_payment = candidates[0]
                    match_tier = f"TIER_3_AMOUNT_DATE_WINDOW_MATCH ({date_tolerance_days}d)"
                elif len(candidates) > 1:
                    # Tier 4: Ambiguity Detection -> Strict EXCEPTION
                    is_exception = True
                    candidate_refs = ", ".join([c.payment_ref for c in candidates])
                    exception_reason = f"Ambiguous match: {len(candidates)} payments match amount ₹{b_amt} within {date_tolerance_days} days ({candidate_refs})"

            # Apply Match or Exception
            if matched_payment and not dry_run:
                b_txn.reconciliation_status = ReconciliationStatus.MATCHED
                b_txn.matched_payment_id = matched_payment.id
                b_txn.reconciled_at = now
                b_txn.reconciled_by = current_user.full_name or "AUTO_RECON_ENGINE"
                b_txn.resolution_notes = f"Matched via {match_tier} against {matched_payment.payment_ref}"

                matched_payment.status = PaymentStatus.RECONCILED

                # Remove from unreconciled candidates so it won't match again
                if matched_payment in unreconciled_payments:
                    unreconciled_payments.remove(matched_payment)

                matched_count += 1
                details.append({
                    "bank_txn_id": b_txn.bank_transaction_id,
                    "status": "MATCHED",
                    "payment_ref": matched_payment.payment_ref,
                    "tier": match_tier,
                    "amount": float(b_amt),
                })

            elif is_exception:
                if not dry_run:
                    b_txn.reconciliation_status = ReconciliationStatus.EXCEPTION
                    b_txn.resolution_notes = exception_reason

                exception_count += 1
                details.append({
                    "bank_txn_id": b_txn.bank_transaction_id,
                    "status": "EXCEPTION",
                    "reason": exception_reason,
                    "amount": float(b_amt),
                })
            else:
                unmatched_count += 1
                details.append({
                    "bank_txn_id": b_txn.bank_transaction_id,
                    "status": "UNMATCHED",
                    "reason": "No matching payment candidate found in ledger",
                    "amount": float(b_amt),
                })

        if not dry_run:
            AuditService.log_event(
                db=db,
                user_id=current_user.id,
                action=AuditAction.RECONCILE,
                entity_type="ReconciliationRun",
                entity_id="AUTO_RUN",
                details={
                    "total_evaluated": len(bank_txns),
                    "matched_count": matched_count,
                    "exception_count": exception_count,
                    "unmatched_count": unmatched_count,
                }
            )
            db.commit()

        return {
            "total_evaluated": len(bank_txns),
            "matched_count": matched_count,
            "exception_count": exception_count,
            "unmatched_count": unmatched_count,
            "details": details,
        }

    @classmethod
    def resolve_mismatch(
        cls,
        mismatch_id: str,
        resolution_notes: str,
        current_user: User,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Manually resolves a flagged mismatch or bank exception with mandatory audit justification.
        """
        allowed_roles = {UserRole.FINANCE_APPROVER, UserRole.ADMIN, UserRole.SYSTEM_ADMIN, UserRole.ACCOUNTS_OFFICER}
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only authorized finance staff can resolve reconciliation mismatches."
            )

        # Check if ID corresponds to Mismatch record
        mismatch = db.query(Mismatch).filter(Mismatch.id == mismatch_id).first()
        if not mismatch:
            # Check by mismatch_code
            mismatch = db.query(Mismatch).filter(Mismatch.mismatch_code == mismatch_id).first()

        if mismatch:
            mismatch.status = "RESOLVED"
            mismatch.resolution_notes = f"[Resolved by {current_user.full_name} on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}]: {resolution_notes}"

            AuditService.log_event(
                db=db,
                user_id=current_user.id,
                action=AuditAction.RECONCILE,
                entity_type="Mismatch",
                entity_id=mismatch.id,
                details={
                    "mismatch_code": mismatch.mismatch_code,
                    "resolution_notes": resolution_notes,
                    "resolved_by": current_user.full_name,
                }
            )
            db.commit()
            return {
                "id": mismatch.id,
                "code": mismatch.mismatch_code,
                "status": mismatch.status,
                "resolution_notes": mismatch.resolution_notes,
                "message": f"Mismatch {mismatch.mismatch_code} successfully resolved."
            }

        # Check if ID corresponds to BankTransaction in EXCEPTION/MISMATCH
        bank_txn = db.query(BankTransaction).filter(
            (BankTransaction.id == mismatch_id) | (BankTransaction.bank_transaction_id == mismatch_id)
        ).first()

        if bank_txn:
            bank_txn.reconciliation_status = ReconciliationStatus.MANUALLY_RESOLVED
            bank_txn.reconciled_at = datetime.now(timezone.utc)
            bank_txn.reconciled_by = current_user.full_name
            bank_txn.resolution_notes = f"[Manual Resolution]: {resolution_notes}"

            AuditService.log_event(
                db=db,
                user_id=current_user.id,
                action=AuditAction.RECONCILE,
                entity_type="BankTransaction",
                entity_id=bank_txn.id,
                details={
                    "bank_transaction_id": bank_txn.bank_transaction_id,
                    "resolution_notes": resolution_notes,
                    "resolved_by": current_user.full_name,
                }
            )
            db.commit()
            return {
                "id": bank_txn.id,
                "code": bank_txn.bank_transaction_id,
                "status": bank_txn.reconciliation_status.value if hasattr(bank_txn.reconciliation_status, "value") else str(bank_txn.reconciliation_status),
                "resolution_notes": bank_txn.resolution_notes,
                "message": f"Bank transaction {bank_txn.bank_transaction_id} marked as MANUALLY_RESOLVED."
            }

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No mismatch or bank exception found with ID/Code '{mismatch_id}'."
        )
