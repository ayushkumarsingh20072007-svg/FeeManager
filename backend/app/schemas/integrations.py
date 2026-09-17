from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date

class WebhookPaymentPayload(BaseModel):
    event: str = Field(..., description="Webhook event type e.g. payment.captured")
    gateway: str = Field(..., description="Gateway provider e.g. RAZORPAY, STRIPE, BILLDESK")
    transaction_id: str = Field(..., description="Gateway payment ID / transaction ref")
    student_id: Optional[str] = Field(None, description="Internal Student UUID")
    roll_no: Optional[str] = Field(None, description="Student Roll Number e.g. STU1001")
    amount: float = Field(..., gt=0, description="Amount in INR")
    payment_channel: Optional[str] = Field("ONLINE_GATEWAY", description="Payment channel")
    payment_date: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Payment timestamp")
    notes: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata / Custom fields")

class WebhookResponse(BaseModel):
    status: str = Field(..., description="Processing status: SUCCESS, DUPLICATE_IGNORED, FAILED")
    message: str = Field(..., description="Status description")
    payment_id: Optional[str] = Field(None, description="Created payment record ID")
    receipt_number: Optional[str] = Field(None, description="Generated receipt number")
    allocated_breakdown: Optional[List[Dict[str, Any]]] = Field(None, description="Priority allocation result")

class ClearanceStatusResponse(BaseModel):
    student_id: str
    roll_no: str
    student_name: str
    program: str
    semester: int
    gross_demand: float
    net_demand: float
    total_paid: float
    outstanding_amount: float
    clearance_status: str = Field(..., description="FULL_CLEARANCE, CONDITIONAL_CLEARANCE, SPECIAL_ENTRY_PERMITTED, BLOCKED_WITH_HOLDS")
    attendance_percentage: float = Field(default=85.0, description="Semester attendance percentage")
    is_attendance_eligible: bool = Field(default=True, description="True if attendance >= 75%")
    is_eligible_for_hall_ticket: bool
    is_eligible_for_semester_reg: bool
    is_eligible_for_degree: bool
    is_eligible_for_hostel: bool
    holds: List[str] = Field(default_factory=list, description="List of active financial hold reasons")
    special_permission: Optional[Dict[str, Any]] = Field(None, description="Active or pending counsellor exam permission details")
    digital_signature: Optional[Dict[str, Any]] = Field(None, description="Auto-generated cryptographic signature block from Finance Department")
    clearance_checklist: Optional[Dict[str, Any]] = Field(None, description="Detailed multi-factor clearance breakdown")
    evaluation_timestamp: datetime = Field(default_factory=datetime.utcnow)

class ScholarshipSyncRequest(BaseModel):
    source_agent: str = Field("Agent-42-Scholarships", description="Identifier of calling agent")
    student_roll: str = Field(..., description="Student Roll Number e.g. STU1002")
    scholarship_name: str = Field(..., description="Name of scholarship e.g. Merit Scholarship 2026")
    amount: float = Field(..., gt=0, description="Scholarship deduction amount")
    academic_year_code: Optional[str] = Field(None, description="Academic year e.g. 2026-27")
    approval_reference: str = Field(..., description="External award reference code")

class ScholarshipSyncResponse(BaseModel):
    status: str
    message: str
    student_roll: str
    scholarship_id: str
    amount_applied: float
    new_net_demand: float
    new_outstanding: float

class NotificationDispatchRequest(BaseModel):
    event_type: str = Field(..., description="FEE_DEMAND, PAYMENT_CONFIRMED, OVERDUE_REMINDER, REFUND_APPROVED")
    recipient_email: str
    recipient_phone: Optional[str] = None
    student_roll: str
    subject: str
    message_body: str
    channels: List[str] = Field(default=["EMAIL", "IN_APP"], description="Channels e.g. EMAIL, SMS, WHATSAPP, IN_APP")

class NotificationLogResponse(BaseModel):
    id: str
    event_type: str
    student_roll: str
    recipient_email: str
    channels: List[str]
    status: str
    dispatched_at: datetime
    content_preview: str

class CashflowForecastResponse(BaseModel):
    forecast_date: date
    horizon_days: int
    projected_total_realization: float
    current_outstanding_pool: float
    expected_realization_rate: float
    bucket_breakdown: List[Dict[str, Any]]
    program_breakdown: List[Dict[str, Any]]

class ExamPermissionRequestCreate(BaseModel):
    reason_category: str = Field(..., description="e.g. EDUCATION_LOAN, AGRICULTURAL_DELAY, FAMILY_HARDSHIP, SALARY_DELAY, OTHER")
    commitment_date: str = Field(..., description="Promised date of payment YYYY-MM-DD")
    reason: str = Field(..., description="Detailed explanation of the situation")
    student_roll: Optional[str] = Field(None, description="Optional roll no if requested on behalf of student")

class ExamPermissionResponse(BaseModel):
    id: str
    approval_code: str
    student_id: str
    student_roll: str
    student_name: str
    program: str
    semester: int
    outstanding_amount: float
    reason_category: str
    reason: str
    commitment_date: Optional[str] = None
    status: str
    requested_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    valid_until: Optional[str] = None
    counsellor_remarks: Optional[str] = None

class ExamPermissionReviewRequest(BaseModel):
    action: str = Field(..., description="APPROVED or REJECTED")
    comments: Optional[str] = Field(None, description="Counsellor notes or reason for rejection")
    valid_until: Optional[str] = Field(None, description="Expiration date of permission YYYY-MM-DD")

class ExamCourseItem(BaseModel):
    course_code: str
    course_title: str
    exam_date: str
    session_time: str
    exam_hall: str
    seat_number: str

class ExamTimetableResponse(BaseModel):
    student_id: str
    roll_no: str
    student_name: str
    program: str
    semester: int
    academic_year: str
    center_name: str
    clearance_status: str
    is_eligible: bool
    attendance_percentage: float = Field(default=85.0, description="Semester attendance percentage")
    is_attendance_eligible: bool = Field(default=True, description="True if attendance >= 75%")
    special_permission_ref: Optional[str] = None
    valid_until: Optional[str] = None
    digital_signature: Optional[Dict[str, Any]] = None
    clearance_checklist: Optional[Dict[str, Any]] = None
    courses: List[ExamCourseItem]
