from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.enums import PaymentChannel, PaymentStatus

class PaymentAllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    fee_demand_item_id: str
    fee_head_name: Optional[str] = None
    fee_head_type: Optional[str] = None
    allocated_amount: float
    priority_applied: Optional[str] = None

class PaymentCreateRequest(BaseModel):
    student_id: str
    fee_demand_id: Optional[str] = None
    amount: float = Field(..., gt=0, description="Payment amount must be greater than 0")
    channel: PaymentChannel = PaymentChannel.COUNTER
    transaction_id: Optional[str] = None
    utr_number: Optional[str] = None
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None
    gateway_name: Optional[str] = None

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    payment_ref: str
    student_id: str
    student_roll: Optional[str] = None
    student_name: Optional[str] = None
    fee_demand_id: Optional[str] = None
    amount: float
    channel: str
    status: str
    transaction_id: Optional[str] = None
    utr_number: Optional[str] = None
    receipt_number: Optional[str] = None
    receipt_id: Optional[str] = None
    payment_date: datetime
    notes: Optional[str] = None
    allocations: List[PaymentAllocationResponse] = []
    created_at: Optional[datetime] = None

class PaymentReversalRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Mandatory audit explanation for reversal")

class PaymentReversalResponse(BaseModel):
    payment_id: str
    payment_ref: str
    status: str
    reversed_amount: float
    restored_outstanding: float
    demand_status: str
    message: str
