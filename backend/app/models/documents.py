from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid

class Receipt(Base, TimestampMixin):
    __tablename__ = "receipts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    receipt_number = Column(String(100), unique=True, index=True, nullable=False)  # e.g., "RCP-2026-00912"
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=False, index=True)
    
    issue_date = Column(DateTime, nullable=False)
    file_path = Column(String(500), nullable=True)
    verification_hash = Column(String(128), nullable=True)

    # Relationships
    payment = relationship("Payment", back_populates="receipts")

    def __repr__(self):
        return f"<Receipt {self.receipt_number}>"

class Certificate(Base, TimestampMixin):
    __tablename__ = "certificates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    certificate_number = Column(String(100), unique=True, index=True, nullable=False)  # e.g., "CERT-LOAN-2026-012"
    certificate_type = Column(String(50), nullable=False)                              # FEE_PAID, TAX_80C, EDUCATION_LOAN, REIMBURSEMENT
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    
    issue_date = Column(DateTime, nullable=False)
    file_path = Column(String(500), nullable=True)
    issued_by = Column(String(100), nullable=False)
    details_json = Column(String(1000), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="certificates")
    academic_year = relationship("AcademicYear")

    def __repr__(self):
        return f"<Certificate {self.certificate_number} Type={self.certificate_type}>"
