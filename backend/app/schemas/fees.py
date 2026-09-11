"""
Pydantic Schemas for Fee Calculations, Demand Generation, and Receipts — Agent 40.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import date, datetime

class FeeHeadItemSchema(BaseModel):
    fee_head_id: str
    head_code: str
    head_name: str
    amount: float
    priority_order: Optional[int] = None
    is_refundable: Optional[bool] = None

class ReductionItemSchema(BaseModel):
    id: str
    name: Optional[str] = None
    reason: Optional[str] = None
    code: Optional[str] = None
    amount: float

class InstallmentTrancheSchema(BaseModel):
    installment_number: int
    amount: float
    due_date: Optional[str] = None
    status: str = "PENDING"

class FeeCalculateRequest(BaseModel):
    student_id: str
    academic_year_id: Optional[str] = None
    fee_structure_id: Optional[str] = None
    installment_count: Optional[int] = None

class FeeCalculateResponse(BaseModel):
    student_id: str
    roll_no: str
    student_name: str
    academic_year_id: str
    academic_year_code: str
    program_id: str
    program_code: str
    regulation_id: str
    regulation_code: str
    category_id: str
    category_code: str
    admission_route_id: str
    admission_route_code: str
    fee_structure_id: str
    fee_structure_version: Optional[str] = None
    fee_items: List[FeeHeadItemSchema]
    gross_fee: float
    scholarship_amount: float
    scholarship_breakdown: List[ReductionItemSchema]
    concession_amount: float
    concession_breakdown: List[ReductionItemSchema]
    waiver_amount: float
    waiver_breakdown: List[ReductionItemSchema]
    total_reductions: float
    net_fee: float
    installment_schedule: List[InstallmentTrancheSchema]
    calculation_timestamp: str

class FeeDemandGenerateRequest(BaseModel):
    student_id: str
    academic_year_id: Optional[str] = None
    fee_structure_id: Optional[str] = None
    installment_count: Optional[int] = None
    due_date: Optional[date] = None

class DemandItemDetailSchema(BaseModel):
    id: str
    head_code: str
    head_name: str
    gross_amount: float
    scholarship_deduction: float = 0.0
    concession_deduction: float = 0.0
    waiver_deduction: float = 0.0
    net_amount: float
    paid_amount: float
    outstanding_amount: float

class FeeDemandDetailResponse(BaseModel):
    demand_id: str
    demand_code: str
    student_id: str
    student_roll: str
    student_name: str
    program_code: str
    academic_year: str
    fee_structure_id: str
    gross_demand: float
    scholarship_amount: float
    concession_amount: float
    waiver_amount: float
    total_reductions: float
    net_demand: float
    paid_amount: float
    outstanding_amount: float
    status: str
    due_date: str
    generation_date: str
    fee_items: List[DemandItemDetailSchema]
    installments: List[InstallmentTrancheSchema]
    is_reused: bool = False

class ReceiptFeeItemSchema(BaseModel):
    head_code: str
    head_name: str
    allocated_amount: float

class ReceiptResponse(BaseModel):
    receipt_id: str
    receipt_number: str
    issue_date: str
    verification_hash: Optional[str] = None
    payment_id: str
    payment_ref: str
    transaction_id: str
    payment_channel: str
    payment_status: str
    payment_date: str
    current_payment_amount: float
    student_id: str
    student_roll: str
    student_name: str
    program_name: str
    program_code: str
    academic_year: str
    semester: int
    category: str
    gross_demand: float
    scholarship_amount: float
    concession_amount: float
    waiver_amount: float
    total_reductions: float
    net_demand: float
    cumulative_paid: float
    remaining_outstanding: float
    fee_head_items: List[ReceiptFeeItemSchema]
