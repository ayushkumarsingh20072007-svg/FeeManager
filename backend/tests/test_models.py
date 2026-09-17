from app.core.database import SessionLocal
from app.models.users import User, Student
from app.models.academics import AcademicYear, Program, FeeHead
from app.models.fee_structures import FeeStructure
from app.models.fee_demands import FeeDemand
from app.models.payments import Payment
from app.models.refunds import RefundRequest
from app.models.reconciliations import AccountingReconciliation, Mismatch

def test_seeded_models_exist_and_relate():
    db = SessionLocal()
    try:
        # Check student STU1001
        student = db.query(Student).filter(Student.roll_no == "STU1001").first()
        assert student is not None
        assert student.user is not None
        assert student.user.email == "aravind.k@student.edu"
        assert student.program.code == "BTECH-CSE"

        # Check fee demand
        demand = db.query(FeeDemand).filter(FeeDemand.student_id == student.id).first()
        assert demand is not None
        assert demand.gross_demand == 178000.0
        assert demand.paid_amount == 178000.0
        assert demand.outstanding_amount == 0.0
        assert len(demand.items) > 0

        # Check versioned fee structure
        structures = db.query(FeeStructure).all()
        assert len(structures) >= 4
        versions = [s.version for s in structures]
        assert "v1.0" in versions

        # Check mismatches
        mismatches = db.query(Mismatch).all()
        assert len(mismatches) == 3

        # Check refund request
        refunds = db.query(RefundRequest).all()
        assert len(refunds) >= 1
        assert refunds[0].proposed_refund_amount == 85000.0

    finally:
        db.close()
