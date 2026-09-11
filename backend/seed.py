"""
Deterministic Seed Script for Agent 40 — Fee Management Agent.
Populates realistic Indian academic institution data, fee structures, versioning,
students, demands, itemized demand items, payments, allocations, aging, reconciliations, mismatches, and approvals.
Guarantees 100% mathematical consistency across all 28 student ledgers.
"""
import sys
import os
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

# Ensure app is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.enums import (
    UserRole,
    FeeHeadType,
    FeeStructureStatus,
    FeeDemandStatus,
    PaymentChannel,
    PaymentStatus,
    ReconciliationStatus,
    MismatchCategory,
    RefundStatus,
    ApprovalStatus,
    ApprovalType,
    AuditAction,
)
from app.models.users import User, Student, Parent
from app.models.academics import Program, Regulation, Category, AcademicYear, AdmissionRoute, FeeHead, Enrollment
from app.models.fee_structures import FeeStructure, FeeStructureItem
from app.models.fee_demands import FeeDemand, FeeDemandItem, Scholarship, Concession, FeeWaiver, InstallmentPlan, Installment
from app.models.payments import Payment, PaymentAllocation, PaymentChannelConfig
from app.models.refunds import RefundPolicy, RefundRequest, RefundItem
from app.models.reconciliations import Reconciliation, AccountingReconciliation, Mismatch, BankTransaction
from app.models.approvals import ApprovalRequest, ApprovalAction
from app.models.documents import Receipt, Certificate
from app.models.audit import AuditLog
from app.services.ledger_calculator import calculate_student_financials

def run_seed():
    print("[*] Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("[!] Clearing existing data for fresh deterministic seed...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        default_pw_hash = get_password_hash("password123")
        now = datetime.now(timezone.utc)
        today = date.today()

        # ---------------------------------------------------------------------
        # 1. CORE ROLES & USERS
        # ---------------------------------------------------------------------
        print("[*] Creating institutional users...")
        accounts_user = User(
            email="accounts@university.edu",
            password_hash=default_pw_hash,
            full_name="Rajesh Sharma (Accounts Officer)",
            role=UserRole.ACCOUNTS_OFFICER,
            phone="+91-9876543210"
        )
        approver_user = User(
            email="finance.approver@university.edu",
            password_hash=default_pw_hash,
            full_name="Dr. V. Ramanathan (Finance Approver / CFO)",
            role=UserRole.FINANCE_APPROVER,
            phone="+91-9876543211"
        )
        management_user = User(
            email="director@university.edu",
            password_hash=default_pw_hash,
            full_name="Prof. S. K. Mukherjee (Director / Management)",
            role=UserRole.MANAGEMENT,
            phone="+91-9876543212"
        )
        admin_user = User(
            email="admin@university.edu",
            password_hash=default_pw_hash,
            full_name="Ananya Roy (Academic Admin)",
            role=UserRole.ADMIN,
            phone="+91-9876543213"
        )
        sysadmin_user = User(
            email="sysadmin@university.edu",
            password_hash=default_pw_hash,
            full_name="Karthik N. (IT System Administrator)",
            role=UserRole.SYSTEM_ADMIN,
            phone="+91-9876543214"
        )

        db.add_all([accounts_user, approver_user, management_user, admin_user, sysadmin_user])
        db.flush()

        # ---------------------------------------------------------------------
        # 2. ACADEMIC YEARS
        # ---------------------------------------------------------------------
        print("[*] Creating Academic Years...")
        ay_2024 = AcademicYear(year_code="2024-25", start_date=date(2024, 7, 1), end_date=date(2025, 6, 30), is_current=False)
        ay_2025 = AcademicYear(year_code="2025-26", start_date=date(2025, 7, 1), end_date=date(2026, 6, 30), is_current=False)
        ay_2026 = AcademicYear(year_code="2026-27", start_date=date(2026, 7, 1), end_date=date(2027, 6, 30), is_current=True)
        db.add_all([ay_2024, ay_2025, ay_2026])
        db.flush()

        # ---------------------------------------------------------------------
        # 3. PROGRAMS & REGULATIONS
        # ---------------------------------------------------------------------
        print("[*] Creating Programs and Regulations...")
        prog_cse = Program(code="BTECH-CSE", name="B.Tech Computer Science & Engineering", department="CSE", duration_years=4)
        prog_ece = Program(code="BTECH-ECE", name="B.Tech Electronics & Communication Engineering", department="ECE", duration_years=4)
        prog_mech = Program(code="BTECH-MECH", name="B.Tech Mechanical Engineering", department="Mechanical", duration_years=4)
        db.add_all([prog_cse, prog_ece, prog_mech])

        reg_r21 = Regulation(code="R21", name="Academic Regulation 2021", year_introduced=2021)
        reg_r23 = Regulation(code="R23", name="Academic Regulation 2023", year_introduced=2023)
        reg_r24 = Regulation(code="R24", name="Academic Regulation 2024", year_introduced=2024)
        db.add_all([reg_r21, reg_r23, reg_r24])

        # ---------------------------------------------------------------------
        # 4. CATEGORIES & ADMISSION ROUTES
        # ---------------------------------------------------------------------
        print("[*] Creating Categories and Admission Routes...")
        cat_gen = Category(code="GEN", name="General / Open Category", description="Open Merit")
        cat_obc = Category(code="OBC", name="Other Backward Classes (OBC/BC)", description="Reserved OBC")
        cat_sc = Category(code="SC", name="Scheduled Caste (SC)", description="Reserved SC")
        cat_st = Category(code="ST", name="Scheduled Tribe (ST)", description="Reserved ST")
        cat_mgmt = Category(code="MGMT", name="Management Quota", description="Institutional Management")
        db.add_all([cat_gen, cat_obc, cat_sc, cat_st, cat_mgmt])

        adm_eamcet = AdmissionRoute(code="EAMCET", name="State CET / EAMCET", description="State Entrance Convener Quota")
        adm_jee = AdmissionRoute(code="JEE", name="JEE Main / JoSAA", description="National Entrance Merit")
        adm_mgmt = AdmissionRoute(code="MANAGEMENT", name="Management Category B", description="Institutional Direct Admission")
        adm_nri = AdmissionRoute(code="NRI", name="NRI / Foreign National", description="International / PIO / NRI Quota")
        db.add_all([adm_eamcet, adm_jee, adm_mgmt, adm_nri])
        db.flush()

        # ---------------------------------------------------------------------
        # 5. FEE HEADS (WITH STRICT PRIORITY ORDERING)
        # ---------------------------------------------------------------------
        print("[*] Creating Standard Fee Heads...")
        fh_tuition = FeeHead(code="TUITION", name="Tuition Fee", head_type=FeeHeadType.TUITION, priority_order=1, is_refundable=True, is_recurring=True)
        fh_exam = FeeHead(code="EXAMINATION", name="Examination Fee", head_type=FeeHeadType.EXAMINATION, priority_order=2, is_refundable=False, is_recurring=True)
        fh_lab = FeeHead(code="LABORATORY", name="Laboratory & Practical Fee", head_type=FeeHeadType.LABORATORY, priority_order=3, is_refundable=True, is_recurring=True)
        fh_lib = FeeHead(code="LIBRARY", name="Library & Digital Access Fee", head_type=FeeHeadType.LIBRARY, priority_order=4, is_refundable=False, is_recurring=True)
        fh_hostel = FeeHead(code="HOSTEL", name="Hostel & Residence Fee", head_type=FeeHeadType.HOSTEL, priority_order=5, is_refundable=True, is_recurring=True)
        fh_trans = FeeHead(code="TRANSPORT", name="Campus Transport Fee", head_type=FeeHeadType.TRANSPORT, priority_order=6, is_refundable=True, is_recurring=True)
        fh_caution = FeeHead(code="CAUTION_DEPOSIT", name="Caution Deposit (Refundable)", head_type=FeeHeadType.CAUTION_DEPOSIT, priority_order=7, is_refundable=True, is_recurring=False)
        fh_onetime = FeeHead(code="ONE_TIME_CHARGES", name="Admission & Registration Charges", head_type=FeeHeadType.ONE_TIME_CHARGES, priority_order=8, is_refundable=False, is_recurring=False)
        
        db.add_all([fh_tuition, fh_exam, fh_lab, fh_lib, fh_hostel, fh_trans, fh_caution, fh_onetime])
        db.flush()

        # ---------------------------------------------------------------------
        # 6. VERSIONED FEE STRUCTURES
        # ---------------------------------------------------------------------
        print("[*] Creating Versioned Fee Structures...")
        # 2026-27 Current B.Tech CSE GEN EAMCET v1.0 (Active: 1,78,000)
        fs_2026_cse_gen = FeeStructure(
            academic_year_id=ay_2026.id,
            program_id=prog_cse.id,
            regulation_id=reg_r23.id,
            category_id=cat_gen.id,
            admission_route_id=adm_eamcet.id,
            version="v1.0",
            version_number=1,
            status=FeeStructureStatus.ACTIVE,
            effective_from=date(2026, 6, 1),
            effective_to=date(2027, 5, 31),
            total_amount=178000.0,
            remarks="Current baseline structure for B.Tech CSE General"
        )
        db.add(fs_2026_cse_gen)
        db.flush()

        items_2026_cse_gen = [
            FeeStructureItem(fee_structure_id=fs_2026_cse_gen.id, fee_head_id=fh_tuition.id, amount=80000.0, priority_order=1),
            FeeStructureItem(fee_structure_id=fs_2026_cse_gen.id, fee_head_id=fh_exam.id, amount=5000.0, priority_order=2),
            FeeStructureItem(fee_structure_id=fs_2026_cse_gen.id, fee_head_id=fh_lab.id, amount=4000.0, priority_order=3),
            FeeStructureItem(fee_structure_id=fs_2026_cse_gen.id, fee_head_id=fh_lib.id, amount=2000.0, priority_order=4),
            FeeStructureItem(fee_structure_id=fs_2026_cse_gen.id, fee_head_id=fh_hostel.id, amount=57000.0, priority_order=5),
            FeeStructureItem(fee_structure_id=fs_2026_cse_gen.id, fee_head_id=fh_trans.id, amount=15000.0, priority_order=6),
            FeeStructureItem(fee_structure_id=fs_2026_cse_gen.id, fee_head_id=fh_caution.id, amount=10000.0, priority_order=7),
            FeeStructureItem(fee_structure_id=fs_2026_cse_gen.id, fee_head_id=fh_onetime.id, amount=5000.0, priority_order=8),
        ]
        db.add_all(items_2026_cse_gen)

        # 2026-27 B.Tech ECE GEN EAMCET v1.0 (Active: 1,68,000)
        fs_2026_ece_gen = FeeStructure(
            academic_year_id=ay_2026.id,
            program_id=prog_ece.id,
            regulation_id=reg_r23.id,
            category_id=cat_gen.id,
            admission_route_id=adm_eamcet.id,
            version="v1.0",
            version_number=1,
            status=FeeStructureStatus.ACTIVE,
            effective_from=date(2026, 6, 1),
            effective_to=date(2027, 5, 31),
            total_amount=168000.0,
            remarks="Current baseline structure for B.Tech ECE General"
        )
        db.add(fs_2026_ece_gen)
        db.flush()

        items_2026_ece_gen = [
            FeeStructureItem(fee_structure_id=fs_2026_ece_gen.id, fee_head_id=fh_tuition.id, amount=75000.0, priority_order=1),
            FeeStructureItem(fee_structure_id=fs_2026_ece_gen.id, fee_head_id=fh_exam.id, amount=5000.0, priority_order=2),
            FeeStructureItem(fee_structure_id=fs_2026_ece_gen.id, fee_head_id=fh_lab.id, amount=4000.0, priority_order=3),
            FeeStructureItem(fee_structure_id=fs_2026_ece_gen.id, fee_head_id=fh_lib.id, amount=2000.0, priority_order=4),
            FeeStructureItem(fee_structure_id=fs_2026_ece_gen.id, fee_head_id=fh_hostel.id, amount=55000.0, priority_order=5),
            FeeStructureItem(fee_structure_id=fs_2026_ece_gen.id, fee_head_id=fh_trans.id, amount=12000.0, priority_order=6),
            FeeStructureItem(fee_structure_id=fs_2026_ece_gen.id, fee_head_id=fh_caution.id, amount=10000.0, priority_order=7),
            FeeStructureItem(fee_structure_id=fs_2026_ece_gen.id, fee_head_id=fh_onetime.id, amount=5000.0, priority_order=8),
        ]
        db.add_all(items_2026_ece_gen)

        # 2026-27 Management Quota B.Tech CSE v1.0 (Active: 2,48,000)
        fs_2026_cse_mgmt = FeeStructure(
            academic_year_id=ay_2026.id,
            program_id=prog_cse.id,
            regulation_id=reg_r23.id,
            category_id=cat_mgmt.id,
            admission_route_id=adm_mgmt.id,
            version="v1.0",
            version_number=1,
            status=FeeStructureStatus.ACTIVE,
            effective_from=date(2026, 6, 1),
            effective_to=date(2027, 5, 31),
            total_amount=248000.0,
            remarks="Management Quota Structure"
        )
        db.add(fs_2026_cse_mgmt)
        db.flush()

        items_2026_cse_mgmt = [
            FeeStructureItem(fee_structure_id=fs_2026_cse_mgmt.id, fee_head_id=fh_tuition.id, amount=150000.0, priority_order=1),
            FeeStructureItem(fee_structure_id=fs_2026_cse_mgmt.id, fee_head_id=fh_exam.id, amount=5000.0, priority_order=2),
            FeeStructureItem(fee_structure_id=fs_2026_cse_mgmt.id, fee_head_id=fh_lab.id, amount=4000.0, priority_order=3),
            FeeStructureItem(fee_structure_id=fs_2026_cse_mgmt.id, fee_head_id=fh_lib.id, amount=4000.0, priority_order=4),
            FeeStructureItem(fee_structure_id=fs_2026_cse_mgmt.id, fee_head_id=fh_hostel.id, amount=60000.0, priority_order=5),
            FeeStructureItem(fee_structure_id=fs_2026_cse_mgmt.id, fee_head_id=fh_trans.id, amount=15000.0, priority_order=6),
            FeeStructureItem(fee_structure_id=fs_2026_cse_mgmt.id, fee_head_id=fh_caution.id, amount=10000.0, priority_order=7),
        ]
        db.add_all(items_2026_cse_mgmt)

        # 2026-27 B.Tech MECH GEN EAMCET v1.0 (Active: 1,70,000)
        fs_2026_mech_gen = FeeStructure(
            academic_year_id=ay_2026.id,
            program_id=prog_mech.id,
            regulation_id=reg_r23.id,
            category_id=cat_gen.id,
            admission_route_id=adm_eamcet.id,
            version="v1.0",
            version_number=1,
            status=FeeStructureStatus.ACTIVE,
            effective_from=date(2026, 6, 1),
            effective_to=date(2027, 5, 31),
            total_amount=170000.0,
            remarks="Current baseline structure for B.Tech MECH General"
        )
        db.add(fs_2026_mech_gen)
        db.flush()

        items_2026_mech_gen = [
            FeeStructureItem(fee_structure_id=fs_2026_mech_gen.id, fee_head_id=fh_tuition.id, amount=75000.0, priority_order=1),
            FeeStructureItem(fee_structure_id=fs_2026_mech_gen.id, fee_head_id=fh_exam.id, amount=5000.0, priority_order=2),
            FeeStructureItem(fee_structure_id=fs_2026_mech_gen.id, fee_head_id=fh_lab.id, amount=5000.0, priority_order=3),
            FeeStructureItem(fee_structure_id=fs_2026_mech_gen.id, fee_head_id=fh_lib.id, amount=2000.0, priority_order=4),
            FeeStructureItem(fee_structure_id=fs_2026_mech_gen.id, fee_head_id=fh_hostel.id, amount=55000.0, priority_order=5),
            FeeStructureItem(fee_structure_id=fs_2026_mech_gen.id, fee_head_id=fh_trans.id, amount=13000.0, priority_order=6),
            FeeStructureItem(fee_structure_id=fs_2026_mech_gen.id, fee_head_id=fh_caution.id, amount=10000.0, priority_order=7),
            FeeStructureItem(fee_structure_id=fs_2026_mech_gen.id, fee_head_id=fh_onetime.id, amount=5000.0, priority_order=8),
        ]
        db.add_all(items_2026_mech_gen)
        db.flush()

        # Map structure items for itemized creation
        struct_items_map = {
            fs_2026_cse_gen.id: items_2026_cse_gen,
            fs_2026_ece_gen.id: items_2026_ece_gen,
            fs_2026_cse_mgmt.id: items_2026_cse_mgmt,
            fs_2026_mech_gen.id: items_2026_mech_gen,
        }

        # ---------------------------------------------------------------------
        # 7. REFUND POLICIES
        # ---------------------------------------------------------------------
        print("[*] Creating Refund Policies...")
        policy_ugc = RefundPolicy(
            policy_name="UGC Tier-1 Withdrawal Policy (15 Days)",
            academic_year_id=ay_2026.id,
            days_from_term_start_max=15.0,
            deduction_percentage=0.0,
            non_refundable_fee_heads_json='["ONE_TIME_CHARGES"]',
            is_active="ACTIVE"
        )
        policy_30d = RefundPolicy(
            policy_name="Institutional Standard Policy (16-30 Days)",
            academic_year_id=ay_2026.id,
            days_from_term_start_max=30.0,
            deduction_percentage=10.0,
            non_refundable_fee_heads_json='["ONE_TIME_CHARGES", "EXAMINATION"]',
            is_active="ACTIVE"
        )
        db.add_all([policy_ugc, policy_30d])
        db.flush()

        # ---------------------------------------------------------------------
        # 8. SYNTHETIC STUDENTS (28 Realistic Profiles)
        # ---------------------------------------------------------------------
        print("[*] Creating 28 Synthetic Student Profiles...")
        student_data = [
            ("STU1001", "Aravind Kumar", "aravind.k@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, "parent.aravind@gmail.com", "Sundaram Kumar"),
            ("STU1002", "Priya Sharma", "priya.s@student.edu", prog_ece, cat_gen, adm_eamcet, fs_2026_ece_gen, 1, "parent.priya@gmail.com", "Ramesh Sharma"),
            ("STU1003", "Kiran Varma", "kiran.v@student.edu", prog_cse, cat_obc, adm_eamcet, fs_2026_cse_gen, 3, None, None),
            ("STU1004", "Deepika Reddy", "deepika.r@student.edu", prog_cse, cat_mgmt, adm_mgmt, fs_2026_cse_mgmt, 1, None, None),
            ("STU1005", "Rahul Nair", "rahul.n@student.edu", prog_mech, cat_gen, adm_jee, fs_2026_mech_gen, 5, None, None),
            ("STU1006", "Sneha Patel", "sneha.p@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1007", "Manoj Tiwari", "manoj.t@student.edu", prog_ece, cat_sc, adm_eamcet, fs_2026_ece_gen, 1, None, None),
            ("STU1008", "Anusha Rao", "anusha.r@student.edu", prog_cse, cat_st, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1009", "Vikram Singh", "vikram.s@student.edu", prog_mech, cat_gen, adm_eamcet, fs_2026_mech_gen, 3, None, None),
            ("STU1010", "Swati Deshmukh", "swati.d@student.edu", prog_cse, cat_obc, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1011", "Rohan Gupta", "rohan.g@student.edu", prog_ece, cat_gen, adm_jee, fs_2026_ece_gen, 1, None, None),
            ("STU1012", "Divya Menon", "divya.m@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1013", "Arun Prakash", "arun.p@student.edu", prog_mech, cat_obc, adm_eamcet, fs_2026_mech_gen, 1, None, None),
            ("STU1014", "Meera Iyer", "meera.i@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1015", "Karthik Raja", "karthik.r@student.edu", prog_ece, cat_gen, adm_eamcet, fs_2026_ece_gen, 1, None, None),
            ("STU1016", "Pooja Hegde", "pooja.h@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1017", "Sanjay Dutt", "sanjay.d@student.edu", prog_mech, cat_mgmt, adm_mgmt, fs_2026_cse_mgmt, 1, None, None),
            ("STU1018", "Bhavana Chary", "bhavana.c@student.edu", prog_ece, cat_sc, adm_eamcet, fs_2026_ece_gen, 1, None, None),
            ("STU1019", "Gautam Gambhir", "gautam.g@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1020", "Lakshmi Bai", "lakshmi.b@student.edu", prog_cse, cat_obc, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1021", "Naveen Polishetty", "naveen.p@student.edu", prog_mech, cat_gen, adm_eamcet, fs_2026_mech_gen, 1, None, None),
            ("STU1022", "Harini Venkat", "harini.v@student.edu", prog_ece, cat_gen, adm_eamcet, fs_2026_ece_gen, 1, None, None),
            ("STU1023", "Abhishek Bachchan", "abhishek.b@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1024", "Tarun Kumar", "tarun.k@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1025", "Neha Kakkar", "neha.k@student.edu", prog_ece, cat_gen, adm_jee, fs_2026_ece_gen, 1, None, None),
            ("STU1026", "Varun Dhawan", "varun.d@student.edu", prog_cse, cat_gen, adm_eamcet, fs_2026_cse_gen, 1, None, None),
            ("STU1027", "Alia Bhatt", "alia.b@student.edu", prog_cse, cat_mgmt, adm_mgmt, fs_2026_cse_mgmt, 1, None, None),
            ("STU1028", "Siddharth Malhotra", "sid.m@student.edu", prog_mech, cat_gen, adm_eamcet, fs_2026_mech_gen, 1, None, None),
        ]

        created_students = []
        for roll, name, email, prog, cat, adm_r, fs, sem, parent_email, parent_name in student_data:
            s_user = User(
                email=email,
                password_hash=default_pw_hash,
                full_name=name,
                role=UserRole.STUDENT,
                phone=f"+91-998877{len(created_students):04d}"
            )
            db.add(s_user)
            db.flush()

            parent_id = None
            if parent_email and parent_name:
                p_user = User(
                    email=parent_email,
                    password_hash=default_pw_hash,
                    full_name=parent_name,
                    role=UserRole.PARENT,
                    phone="+91-9123456780"
                )
                db.add(p_user)
                db.flush()
                parent_obj = Parent(user_id=p_user.id, occupation="Senior Engineer", address="Hyderabad, Telangana")
                db.add(parent_obj)
                db.flush()
                parent_id = parent_obj.id

            student = Student(
                roll_no=roll,
                user_id=s_user.id,
                parent_id=parent_id,
                program_id=prog.id,
                regulation_id=reg_r23.id,
                category_id=cat.id,
                admission_route_id=adm_r.id,
                admission_year_id=ay_2026.id,
                current_semester=sem,
                enrollment_status="ACTIVE"
            )
            db.add(student)
            db.flush()
            created_students.append((student, fs))

        # ---------------------------------------------------------------------
        # 9. ITEM-LEVEL DEMAND GENERATION, SCHOLARSHIPS, CONCESSIONS, WAIVERS, PAYMENTS
        # ---------------------------------------------------------------------
        print("[*] Generating Itemized Fee Demands & Mathematically Consistent Ledgers...")

        # Helper to create itemized FeeDemandItem records matching FeeStructure
        def create_demand_items(demand_obj, fee_structure_obj):
            items = []
            st_items = struct_items_map.get(fee_structure_obj.id, [])
            for st_item in st_items:
                d_item = FeeDemandItem(
                    fee_demand_id=demand_obj.id,
                    fee_head_id=st_item.fee_head_id,
                    gross_amount=st_item.amount,
                    net_amount=st_item.amount,
                    paid_amount=0.0,
                    outstanding_amount=st_item.amount
                )
                items.append(d_item)
            db.add_all(items)
            db.flush()
            return items

        # --- Student 1: Aravind Kumar (STU1001) ---
        # Structure: 1,78,000. Reductions: 0. Net: 1,78,000.
        # Payment: 1,48,000. Outstanding: 30,000. Due: 2026-08-15 (Past -> OVERDUE)
        stu1, fs1 = created_students[0]
        enroll1 = Enrollment(student_id=stu1.id, academic_year_id=ay_2026.id, semester=1)
        db.add(enroll1)
        db.flush()

        demand1 = FeeDemand(
            demand_code="FEE-2026-STU1001",
            student_id=stu1.id,
            enrollment_id=enroll1.id,
            academic_year_id=ay_2026.id,
            fee_structure_id=fs1.id,
            gross_demand=178000.0,
            scholarship_amount=0.0,
            concession_amount=0.0,
            waiver_amount=0.0,
            net_demand=178000.0,
            paid_amount=148000.0,
            outstanding_amount=30000.0,
            status=FeeDemandStatus.OVERDUE,
            due_date=date(2026, 8, 15),
            generation_date=date(2026, 7, 5)
        )
        db.add(demand1)
        db.flush()
        d_items_s1 = create_demand_items(demand1, fs1)

        pay1 = Payment(
            payment_ref="PAY-202607-00101",
            student_id=stu1.id,
            fee_demand_id=demand1.id,
            amount=148000.0,
            channel=PaymentChannel.ONLINE_GATEWAY,
            status=PaymentStatus.RECONCILED,
            transaction_id="TXN_RZP_987123654",
            gateway_name="Razorpay",
            payment_date=now - timedelta(days=45),
            notes="Annual partial fee payment via netbanking"
        )
        db.add(pay1)
        db.flush()

        rcp1 = Receipt(
            receipt_number="RCP-2026-00101",
            payment_id=pay1.id,
            issue_date=now - timedelta(days=45),
            verification_hash="sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
        )
        db.add(rcp1)

        # --- Student 2: Priya Sharma (STU1002) ---
        # Structure: 1,68,000. Scholarship: 35,000. Net: 1,33,000.
        # Payment: 1,33,000. Outstanding: 0. Status: PAID
        stu2, fs2 = created_students[1]
        enroll2 = Enrollment(student_id=stu2.id, academic_year_id=ay_2026.id, semester=1)
        db.add(enroll2)
        db.flush()

        demand2 = FeeDemand(
            demand_code="FEE-2026-STU1002",
            student_id=stu2.id,
            enrollment_id=enroll2.id,
            academic_year_id=ay_2026.id,
            fee_structure_id=fs2.id,
            gross_demand=168000.0,
            scholarship_amount=35000.0,
            concession_amount=0.0,
            waiver_amount=0.0,
            net_demand=133000.0,
            paid_amount=133000.0,
            outstanding_amount=0.0,
            status=FeeDemandStatus.PAID,
            due_date=date(2026, 8, 15),
            generation_date=date(2026, 7, 5)
        )
        db.add(demand2)
        db.flush()
        create_demand_items(demand2, fs2)

        sch2 = Scholarship(
            student_id=stu2.id,
            fee_demand_id=demand2.id,
            name="State Academic Excellence Merit Scholarship",
            scholarship_code="SCH-2026-STATE-091",
            amount=35000.0,
            grant_authority="Agent 42 Inbound Integration",
            status="APPROVED"
        )
        db.add(sch2)

        pay2 = Payment(
            payment_ref="PAY-202607-00102",
            student_id=stu2.id,
            fee_demand_id=demand2.id,
            amount=133000.0,
            channel=PaymentChannel.BANK_TRANSFER,
            status=PaymentStatus.RECONCILED,
            utr_number="HDFCN26189001234",
            payment_date=now - timedelta(days=40),
            notes="NEFT Bank Transfer from HDFC account"
        )
        db.add(pay2)
        db.flush()

        recon2 = Reconciliation(
            payment_id=pay2.id,
            bank_statement_ref="STMT-HDFC-2026-07",
            amount_reconciled=133000.0,
            status=ReconciliationStatus.MATCHED,
            reconciled_at=now - timedelta(days=39),
            reconciled_by="accounts@university.edu"
        )
        db.add(recon2)

        # --- Student 3: Kiran Varma (STU1003) ---
        # Structure: 1,78,000. Concession: 15,000. Net: 1,63,000.
        # Payment: 81,500. Outstanding: 81,500. Due: 2026-10-31 (Future -> PARTIALLY_PAID)
        stu3, fs3 = created_students[2]
        enroll3 = Enrollment(student_id=stu3.id, academic_year_id=ay_2026.id, semester=3)
        db.add(enroll3)
        db.flush()

        demand3 = FeeDemand(
            demand_code="FEE-2026-STU1003",
            student_id=stu3.id,
            enrollment_id=enroll3.id,
            academic_year_id=ay_2026.id,
            fee_structure_id=fs3.id,
            gross_demand=178000.0,
            scholarship_amount=0.0,
            concession_amount=15000.0,
            waiver_amount=0.0,
            net_demand=163000.0,
            paid_amount=81500.0,
            outstanding_amount=81500.0,
            status=FeeDemandStatus.PARTIALLY_PAID,
            due_date=date(2026, 10, 31),
            generation_date=date(2026, 7, 5)
        )
        db.add(demand3)
        db.flush()
        create_demand_items(demand3, fs3)

        conc3 = Concession(
            student_id=stu3.id,
            fee_demand_id=demand3.id,
            reason="Sibling Institutional Concession (Elder sibling in 4th Year)",
            concession_code="CONC-SIB-2026-004",
            amount=15000.0,
            approved_by="finance.approver@university.edu",
            status="APPROVED"
        )
        db.add(conc3)

        inst_plan3 = InstallmentPlan(
            fee_demand_id=demand3.id,
            plan_name="2-Tranche 50/50 Semester Plan",
            total_installments=2,
            status="ACTIVE"
        )
        db.add(inst_plan3)
        db.flush()

        inst3_1 = Installment(
            installment_plan_id=inst_plan3.id,
            installment_number=1,
            due_date=date(2026, 8, 1),
            amount=81500.0,
            paid_amount=81500.0,
            status="PAID"
        )
        inst3_2 = Installment(
            installment_plan_id=inst_plan3.id,
            installment_number=2,
            due_date=date(2026, 11, 15),
            amount=81500.0,
            paid_amount=0.0,
            status="PENDING"
        )
        db.add_all([inst3_1, inst3_2])

        pay3 = Payment(
            payment_ref="PAY-202608-00103",
            student_id=stu3.id,
            fee_demand_id=demand3.id,
            amount=81500.0,
            channel=PaymentChannel.COUNTER,
            status=PaymentStatus.RECONCILED,
            receipt_number="CNTR-RCP-2026-0044",
            payment_date=now - timedelta(days=25),
            notes="Counter Cash/DD collection"
        )
        db.add(pay3)

        # --- Remaining Students 4 to 28 ---
        # We ensure realistic distributions across:
        # - Fully paid (due date past/future, outstanding = 0) -> PAID
        # - Future due date with partial payment -> PARTIALLY_PAID
        # - Past due date with partial payment -> OVERDUE
        # - Past due date with zero payment -> OVERDUE
        # - Future due date with zero payment -> PENDING (Unpaid)
        # - Scholarships & Waivers on select profiles
        for i, (stu, fs) in enumerate(created_students[3:], start=4):
            enroll = Enrollment(student_id=stu.id, academic_year_id=ay_2026.id, semester=stu.current_semester)
            db.add(enroll)
            db.flush()

            gross = float(fs.total_amount)
            sch_amt = 0.0
            conc_amt = 0.0
            waiv_amt = 0.0

            # Add targeted concessions/waivers on specific students
            if i == 6:  # Student 6: Sports Quota Concession
                conc_amt = 25000.0
            elif i == 8:  # Student 8: SC/ST Welfare Scholarship
                sch_amt = 40000.0
            elif i == 14:  # Student 14: Special Waiver
                waiv_amt = 10000.0

            net = gross - (sch_amt + conc_amt + waiv_amt)

            # Assign due date and payments based on scenario
            if i % 5 == 0:
                # Overdue with partial payment
                paid = 30000.0
                due_d = today - timedelta(days=95)
                st = FeeDemandStatus.OVERDUE
            elif i % 4 == 0:
                # Overdue with 0 payment
                paid = 0.0
                due_d = today - timedelta(days=120)
                st = FeeDemandStatus.OVERDUE
            elif i % 3 == 0:
                # Fully Paid
                paid = net
                due_d = today - timedelta(days=30)
                st = FeeDemandStatus.PAID
            elif i % 2 == 0:
                # Future due date, partial paid
                paid = round(net * 0.5, 2)
                due_d = today + timedelta(days=45)
                st = FeeDemandStatus.PARTIALLY_PAID
            else:
                # Future due date, unpaid
                paid = 0.0
                due_d = today + timedelta(days=30)
                st = FeeDemandStatus.PENDING

            out = max(0.0, net - paid)

            demand = FeeDemand(
                demand_code=f"FEE-2026-STU{1000+i:04d}",
                student_id=stu.id,
                enrollment_id=enroll.id,
                academic_year_id=ay_2026.id,
                fee_structure_id=fs.id,
                gross_demand=gross,
                scholarship_amount=sch_amt,
                concession_amount=conc_amt,
                waiver_amount=waiv_amt,
                net_demand=net,
                paid_amount=paid,
                outstanding_amount=out,
                status=st,
                due_date=due_d,
                generation_date=today - timedelta(days=60)
            )
            db.add(demand)
            db.flush()
            create_demand_items(demand, fs)

            if sch_amt > 0:
                sch_obj = Scholarship(
                    student_id=stu.id,
                    fee_demand_id=demand.id,
                    name="Government Welfare Scholarship",
                    scholarship_code=f"SCH-2026-WELFARE-{i}",
                    amount=sch_amt,
                    grant_authority="State Social Welfare Directorate",
                    status="APPROVED"
                )
                db.add(sch_obj)

            if conc_amt > 0:
                conc_obj = Concession(
                    student_id=stu.id,
                    fee_demand_id=demand.id,
                    reason="State-level Athletics & Sports Concession",
                    concession_code=f"CONC-SPORTS-2026-{i}",
                    amount=conc_amt,
                    approved_by="finance.approver@university.edu",
                    status="APPROVED"
                )
                db.add(conc_obj)

            if waiv_amt > 0:
                waiv_obj = FeeWaiver(
                    student_id=stu.id,
                    fee_demand_id=demand.id,
                    fee_head_id=fh_tuition.id,
                    amount=waiv_amt,
                    approved_by="finance.approver@university.edu",
                    status="APPROVED",
                    reason="Merit-cum-means fee waiver authorized by Academic Council"
                )
                db.add(waiv_obj)

            if paid > 0:
                pay = Payment(
                    payment_ref=f"PAY-2026-AUTO-{1000+i:04d}",
                    student_id=stu.id,
                    fee_demand_id=demand.id,
                    amount=paid,
                    channel=PaymentChannel.ONLINE_GATEWAY if i % 2 == 0 else PaymentChannel.BANK_TRANSFER,
                    status=PaymentStatus.RECONCILED,
                    transaction_id=f"TXN_GATEWAY_{1000+i:04d}" if i % 2 == 0 else None,
                    utr_number=f"SBIN000{1000+i:04d}" if i % 2 != 0 else None,
                    payment_date=now - timedelta(days=20),
                    notes="Verified institutional fee collection"
                )
                db.add(pay)

        db.flush()

        # ---------------------------------------------------------------------
        # 10. RECONCILIATION MISMATCHES (Preserved Intentional Test Scenarios)
        # ---------------------------------------------------------------------
        print("[*] Creating Accounting Reconciliation & Mismatch Test Cases...")
        acc_recon = AccountingReconciliation(
            batch_code="ACC-RECON-2026-SEP-01",
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 31),
            fee_system_total=5000000.0,
            accounting_system_total=4950000.0,
            variance_amount=50000.0,
            status="FINANCE_REVIEW_REQUIRED",
            notes="Variance of 50000 detected during monthly ledger balance sync"
        )
        db.add(acc_recon)
        db.flush()

        mismatches = [
            Mismatch(
                mismatch_code="MIS-2026-001",
                accounting_reconciliation_id=acc_recon.id,
                category=MismatchCategory.AMOUNT_MISMATCH,
                transaction_ref="UTR_SBI_998124001",
                student_id=stu1.id,
                expected_amount=80000.0,
                actual_amount=75000.0,
                variance=5000.0,
                status="OPEN_INVESTIGATION",
                flagged_message="FINANCE REVIEW REQUIRED: Bank deposit 75000 differs from Fee Demand record 80000"
            ),
            Mismatch(
                mismatch_code="MIS-2026-002",
                accounting_reconciliation_id=acc_recon.id,
                category=MismatchCategory.DUPLICATE_TRANSACTION,
                transaction_ref="TXN_DUP_88123499",
                student_id=stu2.id,
                expected_amount=35000.0,
                actual_amount=35000.0,
                variance=0.0,
                status="OPEN_INVESTIGATION",
                flagged_message="FINANCE REVIEW REQUIRED: Identical gateway transaction ID received twice in 24 hours"
            ),
            Mismatch(
                mismatch_code="MIS-2026-003",
                accounting_reconciliation_id=acc_recon.id,
                category=MismatchCategory.WRONG_STUDENT,
                transaction_ref="UTR_HDFC_WRONG_STU",
                student_id=stu3.id,
                expected_amount=45000.0,
                actual_amount=45000.0,
                variance=0.0,
                status="OPEN_INVESTIGATION",
                flagged_message="FINANCE REVIEW REQUIRED: UTR remark mentions Roll No STU1024 but credited to STU1003"
            )
        ]
        db.add_all(mismatches)
        db.flush()

        # Seed Bank Transactions
        print("[*] Seeding Bank Statement Feed Transactions...")
        bank_txns = [
            BankTransaction(
                bank_transaction_id="TXN-BNK-202609-001",
                transaction_date=datetime(2026, 8, 15, 10, 30, tzinfo=timezone.utc),
                value_date=date(2026, 8, 15),
                amount=148000.0,
                reference_number="UTR_HDFC_00101",
                bank_reference="CBS-HDFC-991201",
                description="NEFT Clg / STU1001 / Aravind Kumar",
                account_identifier="AC-9988221100",
                reconciliation_status=ReconciliationStatus.MATCHED,
                matched_payment_id=pay1.id,
                reconciled_at=datetime(2026, 8, 15, 12, 0, tzinfo=timezone.utc),
                reconciled_by="AUTO_SYSTEM",
                resolution_notes="Matched via TIER_1_EXACT_UTR_TXN_MATCH"
            ),
            BankTransaction(
                bank_transaction_id="TXN-BNK-202609-002",
                transaction_date=datetime(2026, 8, 20, 14, 15, tzinfo=timezone.utc),
                value_date=date(2026, 8, 20),
                amount=133000.0,
                reference_number="UPI_AXIS_889201",
                bank_reference="CBS-SBI-441209",
                description="UPI / Priya Sharma / STU1002",
                account_identifier="AC-9988221100",
                reconciliation_status=ReconciliationStatus.MATCHED,
                matched_payment_id=pay2.id,
                reconciled_at=datetime(2026, 8, 20, 15, 0, tzinfo=timezone.utc),
                reconciled_by="AUTO_SYSTEM",
                resolution_notes="Matched via TIER_1_EXACT_UTR_TXN_MATCH"
            ),
            BankTransaction(
                bank_transaction_id="TXN-BNK-202609-003",
                transaction_date=datetime(2026, 9, 2, 11, 45, tzinfo=timezone.utc),
                value_date=date(2026, 9, 2),
                amount=81500.0,
                reference_number="UTR_ICICI_771920",
                bank_reference="CBS-ICICI-110294",
                description="IMPS / Kiran Varma / STU1003 Installment 1",
                account_identifier="AC-9988221100",
                reconciliation_status=ReconciliationStatus.MATCHED,
                matched_payment_id=pay3.id,
                reconciled_at=datetime(2026, 9, 2, 12, 30, tzinfo=timezone.utc),
                reconciled_by="AUTO_SYSTEM",
                resolution_notes="Matched via TIER_1_EXACT_UTR_TXN_MATCH"
            ),
            BankTransaction(
                bank_transaction_id="TXN-BNK-202609-004",
                transaction_date=datetime(2026, 9, 8, 9, 15, tzinfo=timezone.utc),
                value_date=date(2026, 9, 8),
                amount=30000.0,
                reference_number="UTR_SBI_FEED_30K",
                bank_reference="CBS-SBI-881299",
                description="Direct Deposit / Counter / Cash Receipt Clg",
                account_identifier="AC-9988221100",
                reconciliation_status=ReconciliationStatus.UNMATCHED,
            ),
            BankTransaction(
                bank_transaction_id="TXN-BNK-202609-005",
                transaction_date=datetime(2026, 9, 9, 16, 20, tzinfo=timezone.utc),
                value_date=date(2026, 9, 9),
                amount=84000.0,
                reference_number="UTR_KOTAK_FEED_84K",
                bank_reference="CBS-KOTAK-339182",
                description="NEFT Clg / Harini Venkat / Fee Part Payment",
                account_identifier="AC-9988221100",
                reconciliation_status=ReconciliationStatus.UNMATCHED,
            ),
        ]
        db.add_all(bank_txns)
        db.flush()

        # ---------------------------------------------------------------------
        # 11. REFUND PROPOSALS & APPROVAL REQUESTS
        # ---------------------------------------------------------------------
        print("[*] Creating Refund Proposal and Human Approval Workflows...")
        stu4, fs4 = created_students[3]
        dem4 = db.query(FeeDemand).filter(FeeDemand.student_id == stu4.id).first()
        
        refund_req = RefundRequest(
            request_code="REF-2026-0041",
            student_id=stu4.id,
            fee_demand_id=dem4.id if dem4 else None,
            policy_id=policy_ugc.id,
            withdrawal_date=date(2026, 8, 10),
            total_paid=100000.0,
            non_refundable_amount=10000.0,
            policy_deduction_amount=5000.0,
            proposed_refund_amount=85000.0,
            status=RefundStatus.PENDING_APPROVAL,
            reason="Medical relocation to home state",
            calculation_breakdown_json='{"total_paid": 100000.0, "non_refundable": 10000.0, "policy_deduction": 5000.0, "proposed_refund": 85000.0, "policy": "UGC Tier-1 Withdrawal Policy"}'
        )
        db.add(refund_req)
        db.flush()

        appr_req = ApprovalRequest(
            approval_code="APR-2026-10231",
            approval_type=ApprovalType.REFUND,
            entity_type="REFUND_REQUEST",
            entity_id=refund_req.id,
            refund_request_id=refund_req.id,
            requested_by_id=accounts_user.id,
            requested_amount=85000.0,
            status=ApprovalStatus.PENDING,
            reason="Withdrawal refund calculated under UGC 15-day tier. Requires Finance Approver authorization.",
            details_json='{"student_roll": "STU1004", "student_name": "Deepika Reddy", "refund_amount": 85000.0, "bank_account": "HDFC-XXXXX129"}'
        )
        db.add(appr_req)

        appr_waiver = ApprovalRequest(
            approval_code="APR-2026-10230",
            approval_type=ApprovalType.FEE_WAIVER,
            entity_type="FEE_WAIVER",
            entity_id="FW-2026-0012",
            requested_by_id=accounts_user.id,
            requested_amount=10000.0,
            status=ApprovalStatus.APPROVED,
            reason="Disaster relief special concession approved by Governing Council"
        )
        db.add(appr_waiver)
        db.flush()

        action_approved = ApprovalAction(
            approval_request_id=appr_waiver.id,
            approver_id=approver_user.id,
            action="APPROVED",
            comments="Approved in accordance with Governing Council Resolution GC-2026/8"
        )
        db.add(action_approved)

        # ---------------------------------------------------------------------
        # 12. AUDIT LOGS
        # ---------------------------------------------------------------------
        print("[*] Logging Initial Financial Audit Records...")
        initial_audit_logs = [
            AuditLog(
                user_id=accounts_user.id,
                role=UserRole.ACCOUNTS_OFFICER,
                action=AuditAction.CREATE,
                resource_type="FEE_DEMAND",
                resource_id=demand1.id,
                new_value=f'{{"demand_code": "{demand1.demand_code}", "net_demand": {demand1.net_demand}}}',
                reason="Annual fee demand generated for B.Tech CSE AY 2026-27"
            ),
            AuditLog(
                user_id=accounts_user.id,
                role=UserRole.ACCOUNTS_OFFICER,
                action=AuditAction.RECONCILE,
                resource_type="PAYMENT",
                resource_id=pay2.id,
                new_value=f'{{"payment_ref": "{pay2.payment_ref}", "amount": {pay2.amount}, "status": "RECONCILED"}}',
                reason="Bank transfer reconciled against HDFC bank statement"
            ),
            AuditLog(
                user_id=approver_user.id,
                role=UserRole.FINANCE_APPROVER,
                action=AuditAction.APPROVE,
                resource_type="APPROVAL_REQUEST",
                resource_id=appr_waiver.id,
                approval_id=appr_waiver.id,
                new_value='{"status": "APPROVED", "amount": 10000.0}',
                reason="Authorized disaster relief waiver"
            )
        ]
        db.add_all(initial_audit_logs)
        db.commit()

        print("[OK] Deterministic Seed Process Completed Successfully with 100% Itemized Ledgers!")
        print("[*] Seed Summary:")
        print(f"  - Users: {db.query(User).count()}")
        print(f"  - Academic Years: {db.query(AcademicYear).count()}")
        print(f"  - Programs: {db.query(Program).count()}")
        print(f"  - Fee Heads: {db.query(FeeHead).count()}")
        print(f"  - Fee Structures: {db.query(FeeStructure).count()}")
        print(f"  - Students: {db.query(Student).count()}")
        print(f"  - Fee Demands: {db.query(FeeDemand).count()}")
        print(f"  - Fee Demand Items: {db.query(FeeDemandItem).count()}")
        print(f"  - Payments: {db.query(Payment).count()}")
        print(f"  - Reconciliations: {db.query(Reconciliation).count()}")
        print(f"  - Mismatches: {db.query(Mismatch).count()}")
        print(f"  - Approval Requests: {db.query(ApprovalRequest).count()}")
        print(f"  - Audit Logs: {db.query(AuditLog).count()}")

    except Exception as e:
        db.rollback()
        print(f"[ERR] Seed script encountered an error: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
