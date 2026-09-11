from sqlalchemy import Column, String, Boolean, Integer, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.enums import FeeHeadType

class Program(Base, TimestampMixin):
    __tablename__ = "programs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "BTECH-CSE"
    name = Column(String(200), nullable=False)                         # e.g., "B.Tech Computer Science & Engineering"
    department = Column(String(100), nullable=False)
    duration_years = Column(Integer, default=4, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    students = relationship("Student", back_populates="program")
    fee_structures = relationship("FeeStructure", back_populates="program")

    def __repr__(self):
        return f"<Program {self.code}>"

class Regulation(Base, TimestampMixin):
    __tablename__ = "regulations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "R23", "R24"
    name = Column(String(200), nullable=False)
    year_introduced = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    students = relationship("Student", back_populates="regulation")
    fee_structures = relationship("FeeStructure", back_populates="regulation")

    def __repr__(self):
        return f"<Regulation {self.code}>"

class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "GEN", "OBC", "SC", "ST", "MGMT"
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    students = relationship("Student", back_populates="category")
    fee_structures = relationship("FeeStructure", back_populates="category")

    def __repr__(self):
        return f"<Category {self.code}>"

class AcademicYear(Base, TimestampMixin):
    __tablename__ = "academic_years"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    year_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "2026-27"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)

    # Relationships
    students = relationship("Student", back_populates="admission_year")
    fee_structures = relationship("FeeStructure", back_populates="academic_year")
    enrollments = relationship("Enrollment", back_populates="academic_year")
    fee_demands = relationship("FeeDemand", back_populates="academic_year")

    def __repr__(self):
        return f"<AcademicYear {self.year_code}>"

class AdmissionRoute(Base, TimestampMixin):
    __tablename__ = "admission_routes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "EAMCET", "JEE", "MANAGEMENT", "NRI"
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    students = relationship("Student", back_populates="admission_route")
    fee_structures = relationship("FeeStructure", back_populates="admission_route")

    def __repr__(self):
        return f"<AdmissionRoute {self.code}>"

class FeeHead(Base, TimestampMixin):
    __tablename__ = "fee_heads"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, index=True, nullable=False)       # e.g., "TUITION", "HOSTEL"
    name = Column(String(100), nullable=False)                              # e.g., "Tuition Fee"
    head_type = Column(SQLEnum(FeeHeadType), nullable=False, default=FeeHeadType.OTHER)
    priority_order = Column(Integer, nullable=False, default=100)           # Lower number = Higher priority in allocation
    is_refundable = Column(Boolean, default=True, nullable=False)
    is_recurring = Column(Boolean, default=True, nullable=False)             # True = Annual/Semester, False = One-time
    description = Column(String(255), nullable=True)

    # Relationships
    structure_items = relationship("FeeStructureItem", back_populates="fee_head")
    demand_items = relationship("FeeDemandItem", back_populates="fee_head")

    def __repr__(self):
        return f"<FeeHead {self.code} (Priority={self.priority_order})>"

class Enrollment(Base, TimestampMixin):
    __tablename__ = "enrollments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    semester = Column(Integer, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)

    # Relationships
    student = relationship("Student", back_populates="enrollments")
    academic_year = relationship("AcademicYear", back_populates="enrollments")
    fee_demands = relationship("FeeDemand", back_populates="enrollment")

    def __repr__(self):
        return f"<Enrollment Student={self.student_id} Sem={self.semester}>"
