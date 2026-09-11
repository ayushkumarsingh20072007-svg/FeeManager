from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.enums import ReconciliationStatus, MismatchCategory

class Reconciliation(Base, TimestampMixin):
    __tablename__ = "reconciliations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    payment_id = Column(String(36), ForeignKey("payments.id"), unique=True, nullable=False)
    bank_statement_ref = Column(String(100), nullable=True)
    
    amount_reconciled = Column(Float, nullable=False)
    status = Column(SQLEnum(ReconciliationStatus), nullable=False, default=ReconciliationStatus.MATCHED)
    reconciled_at = Column(DateTime, nullable=False)
    reconciled_by = Column(String(100), nullable=False)  # User ID or "AUTO_SYSTEM"
    notes = Column(String(500), nullable=True)

    # Relationships
    payment = relationship("Payment", back_populates="reconciliation")

    def __repr__(self):
        return f"<Reconciliation Payment={self.payment_id} Status={self.status}>"

class AccountingReconciliation(Base, TimestampMixin):
    __tablename__ = "accounting_reconciliations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "ACC-RECON-2026-SEP"
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    
    fee_system_total = Column(Float, nullable=False, default=0.0)
    accounting_system_total = Column(Float, nullable=False, default=0.0)
    variance_amount = Column(Float, nullable=False, default=0.0)
    
    status = Column(String(50), default="FINANCE_REVIEW_REQUIRED", nullable=False)
    notes = Column(String(1000), nullable=True)

    # Relationships
    mismatches = relationship("Mismatch", back_populates="accounting_reconciliation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AccountingReconciliation {self.batch_code} Variance={self.variance_amount}>"

class Mismatch(Base, TimestampMixin):
    __tablename__ = "mismatches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mismatch_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "MIS-2026-001"
    accounting_reconciliation_id = Column(String(36), ForeignKey("accounting_reconciliations.id"), nullable=True)
    
    category = Column(SQLEnum(MismatchCategory), nullable=False, default=MismatchCategory.AMOUNT_MISMATCH)
    transaction_ref = Column(String(100), nullable=True, index=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=True)
    
    expected_amount = Column(Float, nullable=False, default=0.0)
    actual_amount = Column(Float, nullable=False, default=0.0)
    variance = Column(Float, nullable=False, default=0.0)
    
    status = Column(String(50), default="OPEN_INVESTIGATION", nullable=False)  # OPEN_INVESTIGATION, RESOLVED, WRITTEN_OFF
    flagged_message = Column(String(500), nullable=False, default="FINANCE REVIEW REQUIRED")
    resolution_notes = Column(String(1000), nullable=True)

    # Relationships
    accounting_reconciliation = relationship("AccountingReconciliation", back_populates="mismatches")
    student = relationship("Student")

    def __repr__(self):
        return f"<Mismatch {self.mismatch_code} Cat={self.category} Variance={self.variance}>"

class BankTransaction(Base, TimestampMixin):
    __tablename__ = "bank_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bank_transaction_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g., TXN-BNK-202609-001
    transaction_date = Column(DateTime, nullable=False)
    value_date = Column(Date, nullable=True)
    
    amount = Column(Float, nullable=False)
    reference_number = Column(String(100), index=True, nullable=True)  # UTR / Payment Ref
    bank_reference = Column(String(100), index=True, nullable=True)    # Core Banking Ref
    description = Column(String(500), nullable=True)                   # Narration
    account_identifier = Column(String(100), nullable=True)            # Bank Account Ref
    
    reconciliation_status = Column(SQLEnum(ReconciliationStatus), nullable=False, default=ReconciliationStatus.UNMATCHED, index=True)
    matched_payment_id = Column(String(36), ForeignKey("payments.id"), nullable=True, index=True)
    reconciled_at = Column(DateTime, nullable=True)
    reconciled_by = Column(String(100), nullable=True)
    resolution_notes = Column(String(1000), nullable=True)

    # Relationships
    matched_payment = relationship("Payment", foreign_keys=[matched_payment_id])

    def __repr__(self):
        return f"<BankTransaction {self.bank_transaction_id} Amount={self.amount} Status={self.reconciliation_status}>"
