from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.enums import PaymentChannel, PaymentStatus

class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    payment_ref = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "PAY-202609-00101"
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    fee_demand_id = Column(String(36), ForeignKey("fee_demands.id"), nullable=True, index=True)
    
    amount = Column(Float, nullable=False)
    channel = Column(SQLEnum(PaymentChannel), nullable=False, default=PaymentChannel.ONLINE_GATEWAY)
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING, index=True)
    
    transaction_id = Column(String(100), unique=True, index=True, nullable=True)  # Gateway transaction ID
    utr_number = Column(String(100), index=True, nullable=True)                  # Bank UTR
    receipt_number = Column(String(100), unique=True, index=True, nullable=True) # Counter Receipt #
    
    payment_date = Column(DateTime, nullable=False)
    gateway_name = Column(String(50), nullable=True)                              # Razorpay, BillDesk, HDFC, SBI
    notes = Column(String(500), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="payments")
    fee_demand = relationship("FeeDemand", back_populates="payments")
    allocations = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")
    reconciliation = relationship("Reconciliation", back_populates="payment", uselist=False)
    receipts = relationship("Receipt", back_populates="payment")

    def __repr__(self):
        return f"<Payment {self.payment_ref} Amount={self.amount} Status={self.status} Channel={self.channel}>"

class PaymentAllocation(Base, TimestampMixin):
    __tablename__ = "payment_allocations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    payment_id = Column(String(36), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_demand_item_id = Column(String(36), ForeignKey("fee_demand_items.id"), nullable=False, index=True)
    
    allocated_amount = Column(Float, nullable=False, default=0.0)
    priority_applied = Column(String(50), nullable=True)  # Fee Head priority level applied

    # Relationships
    payment = relationship("Payment", back_populates="allocations")
    fee_demand_item = relationship("FeeDemandItem", back_populates="allocations")

    def __repr__(self):
        return f"<PaymentAllocation Payment={self.payment_id} Amount={self.allocated_amount}>"

class PaymentChannelConfig(Base, TimestampMixin):
    __tablename__ = "payment_channel_configs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    channel = Column(SQLEnum(PaymentChannel), unique=True, nullable=False)
    provider_name = Column(String(100), nullable=False)
    is_active = Column(String(50), default="ACTIVE", nullable=False)
    config_json = Column(String(1000), nullable=True)

    def __repr__(self):
        return f"<PaymentChannelConfig Channel={self.channel} Provider={self.provider_name}>"
