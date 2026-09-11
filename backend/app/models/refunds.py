from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.enums import RefundStatus

class RefundPolicy(Base, TimestampMixin):
    __tablename__ = "refund_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    policy_name = Column(String(150), nullable=False)                         # e.g., "UGC Standard Withdrawal Policy 2026"
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    
    days_from_term_start_max = Column(Float, nullable=False, default=15.0)   # Tiers: 0-15 days, 16-30 days, etc.
    deduction_percentage = Column(Float, nullable=False, default=0.0)        # 0%, 10%, 20%, 50%, 100%
    non_refundable_fee_heads_json = Column(String(500), nullable=True)        # JSON list of non-refundable codes
    is_active = Column(String(50), default="ACTIVE", nullable=False)

    # Relationships
    refund_requests = relationship("RefundRequest", back_populates="policy")

    def __repr__(self):
        return f"<RefundPolicy {self.policy_name} Deduction={self.deduction_percentage}%>"

class RefundRequest(Base, TimestampMixin):
    __tablename__ = "refund_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "REF-2026-0041"
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    fee_demand_id = Column(String(36), ForeignKey("fee_demands.id"), nullable=True)
    policy_id = Column(String(36), ForeignKey("refund_policies.id"), nullable=True)
    
    withdrawal_date = Column(Date, nullable=False)
    total_paid = Column(Float, nullable=False, default=0.0)
    non_refundable_amount = Column(Float, nullable=False, default=0.0)
    policy_deduction_amount = Column(Float, nullable=False, default=0.0)
    proposed_refund_amount = Column(Float, nullable=False, default=0.0)
    approved_refund_amount = Column(Float, nullable=True)
    
    status = Column(SQLEnum(RefundStatus), nullable=False, default=RefundStatus.DRAFT, index=True)
    calculation_breakdown_json = Column(String(2000), nullable=True)
    reason = Column(String(500), nullable=False)
    processed_at = Column(DateTime, nullable=True)
    disbursement_ref = Column(String(100), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="refund_requests")
    policy = relationship("RefundPolicy", back_populates="refund_requests")
    items = relationship("RefundItem", back_populates="refund_request", cascade="all, delete-orphan")
    approval_request = relationship("ApprovalRequest", back_populates="refund_request", uselist=False)

    def __repr__(self):
        return f"<RefundRequest {self.request_code} Proposed={self.proposed_refund_amount} Status={self.status}>"

class RefundItem(Base, TimestampMixin):
    __tablename__ = "refund_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    refund_request_id = Column(String(36), ForeignKey("refund_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_head_id = Column(String(36), ForeignKey("fee_heads.id"), nullable=False)
    
    paid_amount = Column(Float, nullable=False, default=0.0)
    deduction_amount = Column(Float, nullable=False, default=0.0)
    refundable_amount = Column(Float, nullable=False, default=0.0)

    # Relationships
    refund_request = relationship("RefundRequest", back_populates="items")
    fee_head = relationship("FeeHead")

    def __repr__(self):
        return f"<RefundItem Head={self.fee_head_id} Refundable={self.refundable_amount}>"
