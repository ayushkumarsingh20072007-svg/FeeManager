from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field
from app.models.enums import FeeDemandStatus

class FeeItemPreview(BaseModel):
    head_id: str
    head_code: str
    head_name: str
    priority: int
    gross_amount: float
    scholarship_deduction: float = 0.0
    concession_deduction: float = 0.0
    waiver_deduction: float = 0.0
    net_amount: float
    is_refundable: bool = False

class FeeCalculationRequest(BaseModel):
    student_id: str = Field(..., description="Student ID to calculate fee for")
    academic_year_id: Optional[str] = Field(None, description="Academic year ID (defaults to active AY)")
    semester: Optional[int] = Field(None, description="Semester (defaults to student's current semester)")
    scholarship_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, description="Optional percentage scholarship on tuition")
    scholarship_flat: Optional[float] = Field(None, ge=0.0, description="Optional flat scholarship amount")
    concession_flat: Optional[float] = Field(None, ge=0.0, description="Optional flat concession amount")
    waiver_flat: Optional[float] = Field(None, ge=0.0, description="Optional flat waiver amount")

class FeeCalculationPreviewResponse(BaseModel):
    student_id: str
    student_roll: str
    student_name: str
    program_code: str
    academic_year: str
    regulation: str
    category: str
    fee_structure_id: str
    fee_structure_version: str
    gross_demand: float
    total_scholarship: float
    total_concession: float
    total_waiver: float
    net_demand: float
    items: List[FeeItemPreview]
    applied_rules: List[str]

class FeeDemandCreateRequest(BaseModel):
    student_id: str
    academic_year_id: Optional[str] = None
    semester: Optional[int] = None
    due_date: Optional[date] = None
    scholarship_amount: float = 0.0
    scholarship_name: Optional[str] = None
    concession_amount: float = 0.0
    concession_reason: Optional[str] = None
    waiver_amount: float = 0.0
    waiver_reason: Optional[str] = None

class FeeDemandItemResponse(BaseModel):
    id: str
    head_code: str
    head_name: str
    gross_amount: float
    scholarship_deduction: float
    concession_deduction: float
    waiver_deduction: float
    net_amount: float
    paid_amount: float
    outstanding_amount: float

    model_config = {"from_attributes": True}

class FeeDemandResponse(BaseModel):
    id: str
    demand_code: str
    student_id: str
    student_roll: str
    student_name: str
    program_code: str
    academic_year: str
    gross_demand: float
    scholarship_amount: float
    concession_amount: float
    waiver_amount: float
    net_demand: float
    paid_amount: float
    outstanding_amount: float
    status: FeeDemandStatus
    due_date: date
    generation_date: date
    items: List[FeeDemandItemResponse]

    model_config = {"from_attributes": True}

class ScholarshipApplyRequest(BaseModel):
    name: str = Field(..., description="Scholarship name, e.g. 'State Merit Scholarship'")
    scholarship_code: str = Field(..., description="Unique code, e.g. 'SCH-MERIT-2026'")
    amount: float = Field(..., gt=0, description="Monetary value of scholarship")
    grant_authority: str = Field("Institutional Board", description="Grant authority name")

class ConcessionApplyRequest(BaseModel):
    reason: str = Field(..., description="Reason for concession, e.g. 'Sibling Concession'")
    concession_code: str = Field(..., description="Unique concession code, e.g. 'CONC-SIB-01'")
    amount: float = Field(..., gt=0, description="Monetary value of concession")
    approved_by: str = Field("Accounts Officer", description="Approver name")

class FeeWaiverApplyRequest(BaseModel):
    reason: str = Field(..., description="Reason for fee waiver")
    fee_head_code: Optional[str] = Field(None, description="Optional specific fee head code e.g. 'HOSTEL'")
    amount: float = Field(..., gt=0, description="Monetary waiver amount")
    approved_by: str = Field("Finance Approver", description="Approver name")

class InstallmentDetailResponse(BaseModel):
    id: str
    installment_number: int
    due_date: date
    amount: float
    paid_amount: float
    penalty_amount: float
    status: str

    model_config = {"from_attributes": True}

class InstallmentPlanCreateRequest(BaseModel):
    plan_name: str = Field("Standard Installment Plan", description="Installment plan name")
    total_installments: int = Field(2, ge=2, le=4, description="Number of installments (2, 3, or 4)")
    first_due_date: Optional[date] = Field(None, description="Due date for first installment")
    interval_days: int = Field(30, ge=15, le=90, description="Days between installments")

class InstallmentPlanResponse(BaseModel):
    id: str
    fee_demand_id: str
    plan_name: str
    total_installments: int
    status: str
    installments: List[InstallmentDetailResponse]

    model_config = {"from_attributes": True}
