from sqlalchemy import Column, String, Integer, Float, Date, ForeignKey, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.enums import FeeDemandStatus

class FeeDemand(Base, TimestampMixin):
    __tablename__ = "fee_demands"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    demand_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "FEE-2026-STU1024"
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_id = Column(String(36), ForeignKey("enrollments.id"), nullable=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    fee_structure_id = Column(String(36), ForeignKey("fee_structures.id"), nullable=False)
    
    # Financial ledger amounts
    gross_demand = Column(Float, nullable=False, default=0.0)
    scholarship_amount = Column(Float, nullable=False, default=0.0)
    concession_amount = Column(Float, nullable=False, default=0.0)
    waiver_amount = Column(Float, nullable=False, default=0.0)
    net_demand = Column(Float, nullable=False, default=0.0)
    paid_amount = Column(Float, nullable=False, default=0.0)
    outstanding_amount = Column(Float, nullable=False, default=0.0)
    
    status = Column(SQLEnum(FeeDemandStatus), nullable=False, default=FeeDemandStatus.PENDING)
    due_date = Column(Date, nullable=False)
    generation_date = Column(Date, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="fee_demands")
    enrollment = relationship("Enrollment", back_populates="fee_demands")
    academic_year = relationship("AcademicYear", back_populates="fee_demands")
    fee_structure = relationship("FeeStructure", back_populates="fee_demands")
    
    items = relationship("FeeDemandItem", back_populates="fee_demand", cascade="all, delete-orphan")
    scholarships = relationship("Scholarship", back_populates="fee_demand")
    concessions = relationship("Concession", back_populates="fee_demand")
    waivers = relationship("FeeWaiver", back_populates="fee_demand")
    installment_plan = relationship("InstallmentPlan", back_populates="fee_demand", uselist=False)
    payments = relationship("Payment", back_populates="fee_demand")

    def __repr__(self):
        return f"<FeeDemand {self.demand_code} Net={self.net_demand} Outstanding={self.outstanding_amount}>"

class FeeDemandItem(Base, TimestampMixin):
    __tablename__ = "fee_demand_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    fee_demand_id = Column(String(36), ForeignKey("fee_demands.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_head_id = Column(String(36), ForeignKey("fee_heads.id"), nullable=False)
    
    gross_amount = Column(Float, nullable=False, default=0.0)
    scholarship_deduction = Column(Float, nullable=False, default=0.0)
    concession_deduction = Column(Float, nullable=False, default=0.0)
    waiver_deduction = Column(Float, nullable=False, default=0.0)
    net_amount = Column(Float, nullable=False, default=0.0)
    paid_amount = Column(Float, nullable=False, default=0.0)
    outstanding_amount = Column(Float, nullable=False, default=0.0)

    __table_args__ = (
        UniqueConstraint("fee_demand_id", "fee_head_id", name="uq_fee_demand_head_item"),
    )

    # Relationships
    fee_demand = relationship("FeeDemand", back_populates="items")
    fee_head = relationship("FeeHead", back_populates="demand_items")
    allocations = relationship("PaymentAllocation", back_populates="fee_demand_item")

    def __repr__(self):
        return f"<FeeDemandItem Head={self.fee_head_id} Net={self.net_amount} Outstanding={self.outstanding_amount}>"

class Scholarship(Base, TimestampMixin):
    __tablename__ = "scholarships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_demand_id = Column(String(36), ForeignKey("fee_demands.id"), nullable=True)
    name = Column(String(150), nullable=False)                               # e.g., "State Merit Scholarship"
    scholarship_code = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    grant_authority = Column(String(100), nullable=False)                    # e.g., "Agent 42 / State Govt"
    status = Column(String(50), default="APPLIED", nullable=False)           # APPLIED, PROCESSED, REVOKED

    # Relationships
    student = relationship("Student", back_populates="scholarships")
    fee_demand = relationship("FeeDemand", back_populates="scholarships")

    def __repr__(self):
        return f"<Scholarship {self.name} Amount={self.amount}>"

class Concession(Base, TimestampMixin):
    __tablename__ = "concessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_demand_id = Column(String(36), ForeignKey("fee_demands.id"), nullable=True)
    reason = Column(String(200), nullable=False)                             # e.g., "Sibling Concession / Sports Quota"
    concession_code = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    approved_by = Column(String(100), nullable=False)
    status = Column(String(50), default="APPROVED", nullable=False)

    # Relationships
    student = relationship("Student", back_populates="concessions")
    fee_demand = relationship("FeeDemand", back_populates="concessions")

    def __repr__(self):
        return f"<Concession {self.reason} Amount={self.amount}>"

class FeeWaiver(Base, TimestampMixin):
    __tablename__ = "fee_waivers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_demand_id = Column(String(36), ForeignKey("fee_demands.id"), nullable=True)
    fee_head_id = Column(String(36), ForeignKey("fee_heads.id"), nullable=True)
    reason = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    approved_by = Column(String(100), nullable=False)
    status = Column(String(50), default="APPROVED", nullable=False)

    # Relationships
    student = relationship("Student", back_populates="waivers")
    fee_demand = relationship("FeeDemand", back_populates="waivers")

    def __repr__(self):
        return f"<FeeWaiver Head={self.fee_head_id} Amount={self.amount}>"

class InstallmentPlan(Base, TimestampMixin):
    __tablename__ = "installment_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    fee_demand_id = Column(String(36), ForeignKey("fee_demands.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_name = Column(String(100), nullable=False)                          # e.g., "3-Tranche Installment Plan"
    total_installments = Column(Integer, nullable=False, default=2)
    status = Column(String(50), default="ACTIVE", nullable=False)

    # Relationships
    fee_demand = relationship("FeeDemand", back_populates="installment_plan")
    installments = relationship("Installment", back_populates="plan", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<InstallmentPlan Demand={self.fee_demand_id} Tranches={self.total_installments}>"

class Installment(Base, TimestampMixin):
    __tablename__ = "installments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    installment_plan_id = Column(String(36), ForeignKey("installment_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    paid_amount = Column(Float, nullable=False, default=0.0)
    penalty_amount = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), default="PENDING", nullable=False)           # PENDING, PAID, OVERDUE

    # Relationships
    plan = relationship("InstallmentPlan", back_populates="installments")

    def __repr__(self):
        return f"<Installment #{self.installment_number} Due={self.due_date} Amount={self.amount}>"
