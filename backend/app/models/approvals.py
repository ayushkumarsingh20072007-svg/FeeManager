from sqlalchemy import Column, String, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.enums import ApprovalStatus, ApprovalType

class ApprovalRequest(Base, TimestampMixin):
    __tablename__ = "approval_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    approval_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "APR-2026-10231"
    approval_type = Column(SQLEnum(ApprovalType), nullable=False, default=ApprovalType.REFUND)
    
    entity_type = Column(String(50), nullable=False)                            # e.g., "REFUND_REQUEST", "FEE_WAIVER"
    entity_id = Column(String(36), nullable=False, index=True)
    refund_request_id = Column(String(36), ForeignKey("refund_requests.id"), nullable=True)
    
    requested_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    requested_amount = Column(Float, nullable=False, default=0.0)
    
    status = Column(SQLEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.PENDING, index=True)
    reason = Column(String(500), nullable=False)
    details_json = Column(String(2000), nullable=True)

    # Relationships
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    refund_request = relationship("RefundRequest", back_populates="approval_request")
    actions = relationship("ApprovalAction", back_populates="approval_request", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ApprovalRequest {self.approval_code} Type={self.approval_type} Status={self.status}>"

class ApprovalAction(Base, TimestampMixin):
    __tablename__ = "approval_actions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    approval_request_id = Column(String(36), ForeignKey("approval_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    approver_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    action = Column(String(50), nullable=False)  # APPROVED, REJECTED
    comments = Column(String(500), nullable=True)

    # Relationships
    approval_request = relationship("ApprovalRequest", back_populates="actions")
    approver = relationship("User", back_populates="approval_actions")

    def __repr__(self):
        return f"<ApprovalAction Request={self.approval_request_id} Approver={self.approver_id} Action={self.action}>"
