from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid
from app.models.enums import AuditAction, UserRole

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    role = Column(SQLEnum(UserRole), nullable=True)
    
    action = Column(SQLEnum(AuditAction), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)  # e.g., "STUDENT_FEE_DEMAND", "PAYMENT", "REFUND"
    resource_id = Column(String(100), nullable=True, index=True)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    
    old_value = Column(Text, nullable=True)                          # JSON serialized previous state
    new_value = Column(Text, nullable=True)                          # JSON serialized updated state
    
    approval_id = Column(String(36), nullable=True)                  # Foreign reference to approval request
    reason = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    request_id = Column(String(100), nullable=True, index=True)

    # Relationships
    actor = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog {self.action} {self.resource_type}:{self.resource_id} by User={self.user_id}>"
