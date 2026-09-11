from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from app.models.enums import ReconciliationStatus, MismatchCategory

class BankTransactionCreate(BaseModel):
    bank_transaction_id: str = Field(..., min_length=3)
    transaction_date: datetime
    value_date: Optional[date] = None
    amount: float = Field(..., gt=0)
    reference_number: Optional[str] = None
    bank_reference: Optional[str] = None
    description: Optional[str] = None
    account_identifier: Optional[str] = None

class BankTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    bank_transaction_id: str
    transaction_date: datetime
    value_date: Optional[date] = None
    amount: float
    reference_number: Optional[str] = None
    bank_reference: Optional[str] = None
    description: Optional[str] = None
    account_identifier: Optional[str] = None
    reconciliation_status: str
    matched_payment_id: Optional[str] = None
    reconciled_at: Optional[datetime] = None
    reconciled_by: Optional[str] = None
    resolution_notes: Optional[str] = None

class ReconciliationMatchRequest(BaseModel):
    date_tolerance_days: int = Field(default=3, ge=0, le=30)
    dry_run: bool = False

class ReconciliationMatchResult(BaseModel):
    total_evaluated: int
    matched_count: int
    exception_count: int
    unmatched_count: int
    details: List[Dict[str, Any]] = []

class MismatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    mismatch_code: str
    category: str
    transaction_ref: Optional[str] = None
    student_id: Optional[str] = None
    student_roll: Optional[str] = None
    expected_amount: float
    actual_amount: float
    variance: float
    status: str
    flagged_message: str
    resolution_notes: Optional[str] = None

class MismatchResolveRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=3, description="Audit justification for resolution")
    action: Optional[str] = "MANUALLY_RESOLVED"
