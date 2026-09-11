from sqlalchemy import Column, String, Boolean, Integer, Float, Date, ForeignKey, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.enums import FeeStructureStatus

class FeeStructure(Base, TimestampMixin):
    __tablename__ = "fee_structures"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    program_id = Column(String(36), ForeignKey("programs.id"), nullable=False, index=True)
    regulation_id = Column(String(36), ForeignKey("regulations.id"), nullable=False)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=False)
    admission_route_id = Column(String(36), ForeignKey("admission_routes.id"), nullable=False)
    
    version = Column(String(20), nullable=False, default="v1.0")          # e.g., "v1.0", "v2.0"
    version_number = Column(Integer, nullable=False, default=1)
    status = Column(SQLEnum(FeeStructureStatus), nullable=False, default=FeeStructureStatus.ACTIVE)
    
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    total_amount = Column(Float, nullable=False, default=0.0)
    remarks = Column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "academic_year_id", "program_id", "regulation_id", "category_id", "admission_route_id", "version",
            name="uq_fee_structure_version_dim"
        ),
    )

    # Relationships
    academic_year = relationship("AcademicYear", back_populates="fee_structures")
    program = relationship("Program", back_populates="fee_structures")
    regulation = relationship("Regulation", back_populates="fee_structures")
    category = relationship("Category", back_populates="fee_structures")
    admission_route = relationship("AdmissionRoute", back_populates="fee_structures")
    
    items = relationship("FeeStructureItem", back_populates="fee_structure", cascade="all, delete-orphan")
    fee_demands = relationship("FeeDemand", back_populates="fee_structure")

    def __repr__(self):
        return f"<FeeStructure {self.program_id} AY={self.academic_year_id} Ver={self.version} Status={self.status}>"

class FeeStructureItem(Base, TimestampMixin):
    __tablename__ = "fee_structure_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    fee_structure_id = Column(String(36), ForeignKey("fee_structures.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_head_id = Column(String(36), ForeignKey("fee_heads.id"), nullable=False)
    
    amount = Column(Float, nullable=False, default=0.0)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    priority_order = Column(Integer, nullable=False, default=100)
    is_refundable = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("fee_structure_id", "fee_head_id", name="uq_fee_structure_item_head"),
    )

    # Relationships
    fee_structure = relationship("FeeStructure", back_populates="items")
    fee_head = relationship("FeeHead", back_populates="structure_items")

    def __repr__(self):
        return f"<FeeStructureItem Head={self.fee_head_id} Amount={self.amount}>"
