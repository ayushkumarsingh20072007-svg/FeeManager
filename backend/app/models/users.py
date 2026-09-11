from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.enums import UserRole

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.STUDENT, index=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False, foreign_keys="Student.user_id")
    parent_profile = relationship("Parent", back_populates="user", uselist=False, foreign_keys="Parent.user_id")
    audit_logs = relationship("AuditLog", back_populates="actor")
    approval_actions = relationship("ApprovalAction", back_populates="approver")

    @property
    def student(self):
        return self.student_profile

    @property
    def parent(self):
        return self.parent_profile

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"

class Parent(Base, TimestampMixin):
    __tablename__ = "parents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    occupation = Column(String(100), nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)

    # Relationships
    user = relationship("User", back_populates="parent_profile", foreign_keys=[user_id])
    wards = relationship("Student", back_populates="parent")

    def __repr__(self):
        return f"<Parent ID={self.id} UserID={self.user_id}>"

class Student(Base, TimestampMixin):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    roll_no = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    parent_id = Column(String(36), ForeignKey("parents.id", ondelete="SET NULL"), nullable=True)
    
    program_id = Column(String(36), ForeignKey("programs.id"), nullable=False)
    regulation_id = Column(String(36), ForeignKey("regulations.id"), nullable=False)

    @property
    def roll_number(self):
        return self.roll_no
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=False)
    admission_route_id = Column(String(36), ForeignKey("admission_routes.id"), nullable=False)
    admission_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    
    current_semester = Column(Integer, default=1, nullable=False)
    enrollment_status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, WITHDRAWN, GRADUATED, SUSPENDED

    # Relationships
    user = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    parent = relationship("Parent", back_populates="wards", foreign_keys=[parent_id])
    program = relationship("Program", back_populates="students")
    regulation = relationship("Regulation", back_populates="students")
    category = relationship("Category", back_populates="students")
    admission_route = relationship("AdmissionRoute", back_populates="students")
    admission_year = relationship("AcademicYear", back_populates="students")
    
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    fee_demands = relationship("FeeDemand", back_populates="student", cascade="all, delete-orphan")
    scholarships = relationship("Scholarship", back_populates="student", cascade="all, delete-orphan")
    concessions = relationship("Concession", back_populates="student", cascade="all, delete-orphan")
    waivers = relationship("FeeWaiver", back_populates="student", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="student")
    refund_requests = relationship("RefundRequest", back_populates="student")
    certificates = relationship("Certificate", back_populates="student")

    def __repr__(self):
        return f"<Student {self.roll_no}>"
