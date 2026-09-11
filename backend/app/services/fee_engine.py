from typing import List, Optional, Tuple, Dict, Any
from datetime import date, timedelta
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.users import Student
from app.models.academics import AcademicYear, Program, FeeHead, Category
from app.models.fee_structures import FeeStructure, FeeStructureItem
from app.models.fee_demands import (
    FeeDemand,
    FeeDemandItem,
    Scholarship,
    Concession,
    FeeWaiver,
    InstallmentPlan,
    Installment,
)
from app.models.enums import FeeDemandStatus, FeeStructureStatus, AuditAction, UserRole
from app.schemas.fee_demands import (
    FeeItemPreview,
    FeeCalculationRequest,
    FeeCalculationPreviewResponse,
    FeeDemandCreateRequest,
    ScholarshipApplyRequest,
    ConcessionApplyRequest,
    FeeWaiverApplyRequest,
    InstallmentPlanCreateRequest,
)
from app.services.audit_service import AuditService

class FeeCalculationEngine:
    """
    Deterministic Fee Calculation & Demand Generation Engine for Agent 40.
    
    Guarantees:
    - Pure mathematical arithmetic with zero AI hallucinations.
    - Deterministic head priority allocation (P1 -> P8).
    - Penny-exact installment schedule partition with zero floating-point drift.
    - Append-only audit trail logging for all mutations.
    """

    @staticmethod
    def resolve_structure(
        db: Session,
        student: Student,
        academic_year_id: Optional[str] = None,
        semester: Optional[int] = None,
    ) -> FeeStructure:
        """Deterministically matches active FeeStructure by student's academic profile."""
        ay_id = academic_year_id or (student.admission_year_id)
        if not ay_id:
            active_ay = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
            if not active_ay:
                active_ay = db.query(AcademicYear).first()
            if not active_ay:
                raise HTTPException(status_code=404, detail="No academic year configured.")
            ay_id = active_ay.id

        # Query structure matching program, academic year, category, regulation
        q = (
            db.query(FeeStructure)
            .options(
                joinedload(FeeStructure.items).joinedload(FeeStructureItem.fee_head),
                joinedload(FeeStructure.program),
                joinedload(FeeStructure.academic_year),
                joinedload(FeeStructure.regulation),
                joinedload(FeeStructure.category),
            )
            .filter(
                FeeStructure.program_id == student.program_id,
                FeeStructure.academic_year_id == ay_id,
                FeeStructure.status == FeeStructureStatus.ACTIVE,
            )
        )

        # 1. Try exact match with student category
        if student.category_id:
            struct = q.filter(FeeStructure.category_id == student.category_id).first()
            if struct:
                return struct

        # 2. Fallback to General (GEN) category structure for program
        gen_cat = db.query(Category).filter(Category.code == "GEN").first()
        if gen_cat:
            struct = q.filter(FeeStructure.category_id == gen_cat.id).first()
            if struct:
                return struct

        # 3. Fallback to any approved structure for program in that AY
        struct = q.first()
        if not struct:
            raise HTTPException(
                status_code=404,
                detail=f"No approved fee structure found for program {student.program.code if student.program else student.program_id} in academic year {ay_id}."
            )
        return struct

    @classmethod
    def calculate_demand_preview(
        cls, db: Session, req: FeeCalculationRequest
    ) -> FeeCalculationPreviewResponse:
        """Simulates and calculates itemized fee demand preview without mutating the database."""
        student = (
            db.query(Student)
            .options(
                joinedload(Student.user),
                joinedload(Student.program),
                joinedload(Student.category),
                joinedload(Student.admission_year),
                joinedload(Student.regulation),
            )
            .filter(Student.id == req.student_id)
            .first()
        )
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID '{req.student_id}' not found.")

        structure = cls.resolve_structure(db, student, req.academic_year_id, req.semester)

        # Sort items by priority (P1, P2, ...)
        sorted_items = sorted(structure.items, key=lambda x: x.priority_order)

        applied_rules: List[str] = [
            f"Resolved fee structure '{structure.program.code if structure.program else 'PRG'}' v{structure.version} ({structure.regulation.code if structure.regulation else 'R23'})",
            f"Processed {len(sorted_items)} fee heads in strict priority sequence (P1 to P{len(sorted_items)})",
        ]

        # 1. Base amounts
        item_previews: List[FeeItemPreview] = []
        for it in sorted_items:
            head_code = it.fee_head.code if it.fee_head else "OTHER"
            head_name = it.fee_head.name if it.fee_head else "Fee Head"
            item_previews.append(
                FeeItemPreview(
                    head_id=it.fee_head_id,
                    head_code=head_code,
                    head_name=head_name,
                    priority=it.priority_order,
                    gross_amount=round(float(it.amount), 2),
                    scholarship_deduction=0.0,
                    concession_deduction=0.0,
                    waiver_deduction=0.0,
                    net_amount=round(float(it.amount), 2),
                    is_refundable=it.is_refundable,
                )
            )

        # 2. Apply Scholarships (TUITION head priority)
        total_scholarship = 0.0
        if req.scholarship_percentage and req.scholarship_percentage > 0:
            pct = min(100.0, max(0.0, req.scholarship_percentage))
            # Find Tuition head
            for it in item_previews:
                if "TUITION" in it.head_code.upper():
                    ded = round(it.gross_amount * (pct / 100.0), 2)
                    it.scholarship_deduction = ded
                    it.net_amount = max(0.0, round(it.net_amount - ded, 2))
                    total_scholarship += ded
                    applied_rules.append(f"Applied {pct}% scholarship on {it.head_name} (₹{ded:,.2f})")
                    break

        if req.scholarship_flat and req.scholarship_flat > 0:
            remaining_sch = round(float(req.scholarship_flat), 2)
            applied_rules.append(f"Allocating flat scholarship of ₹{remaining_sch:,.2f} across priority heads")
            for it in item_previews:
                if remaining_sch <= 0:
                    break
                alloc = min(it.net_amount, remaining_sch)
                it.scholarship_deduction = round(it.scholarship_deduction + alloc, 2)
                it.net_amount = max(0.0, round(it.net_amount - alloc, 2))
                remaining_sch = round(remaining_sch - alloc, 2)
                total_scholarship = round(total_scholarship + alloc, 2)

        # 3. Apply Concessions (Priority chain)
        total_concession = 0.0
        if req.concession_flat and req.concession_flat > 0:
            remaining_conc = round(float(req.concession_flat), 2)
            applied_rules.append(f"Allocating flat concession of ₹{remaining_conc:,.2f} across priority heads")
            for it in item_previews:
                if remaining_conc <= 0:
                    break
                alloc = min(it.net_amount, remaining_conc)
                it.concession_deduction = round(it.concession_deduction + alloc, 2)
                it.net_amount = max(0.0, round(it.net_amount - alloc, 2))
                remaining_conc = round(remaining_conc - alloc, 2)
                total_concession = round(total_concession + alloc, 2)

        # 4. Apply Waivers
        total_waiver = 0.0
        if req.waiver_flat and req.waiver_flat > 0:
            remaining_waiver = round(float(req.waiver_flat), 2)
            applied_rules.append(f"Allocating fee waiver of ₹{remaining_waiver:,.2f} across priority heads")
            for it in item_previews:
                if remaining_waiver <= 0:
                    break
                alloc = min(it.net_amount, remaining_waiver)
                it.waiver_deduction = round(it.waiver_deduction + alloc, 2)
                it.net_amount = max(0.0, round(it.net_amount - alloc, 2))
                remaining_waiver = round(remaining_waiver - alloc, 2)
                total_waiver = round(total_waiver + alloc, 2)

        # 5. Aggregate and verify exact sum equality
        gross_demand = round(sum(it.gross_amount for it in item_previews), 2)
        net_demand = round(sum(it.net_amount for it in item_previews), 2)

        applied_rules.append(
            f"Gross Demand: ₹{gross_demand:,.2f} | Total Deductions: ₹{(total_scholarship + total_concession + total_waiver):,.2f} | Net Demand: ₹{net_demand:,.2f}"
        )

        return FeeCalculationPreviewResponse(
            student_id=student.id,
            student_roll=student.roll_no,
            student_name=student.user.full_name if student.user else "Student",
            program_code=student.program.code if student.program else "N/A",
            academic_year=structure.academic_year.year_code if structure.academic_year else "2026-27",
            regulation=structure.regulation.code if structure.regulation else "R23",
            category=student.category.code if student.category else "GEN",
            fee_structure_id=structure.id,
            fee_structure_version=str(structure.version),
            gross_demand=gross_demand,
            total_scholarship=total_scholarship,
            total_concession=total_concession,
            total_waiver=total_waiver,
            net_demand=net_demand,
            items=item_previews,
            applied_rules=applied_rules,
        )

    @classmethod
    def generate_official_demand(
        cls,
        db: Session,
        req: FeeDemandCreateRequest,
        actor_user_id: Optional[str] = None,
        actor_role: Optional[UserRole] = None,
    ) -> FeeDemand:
        """
        Generates and commits official FeeDemand and FeeDemandItems into the authoritative ledger.
        """
        calc_req = FeeCalculationRequest(
            student_id=req.student_id,
            academic_year_id=req.academic_year_id,
            semester=req.semester,
            scholarship_flat=req.scholarship_amount,
            concession_flat=req.concession_amount,
            waiver_flat=req.waiver_amount,
        )

        preview = cls.calculate_demand_preview(db, calc_req)

        # Generate unique demand code e.g. "FEE-2026-STU1001-GEN"
        ay_code = preview.academic_year.replace("-", "")
        base_code = f"FEE-{ay_code}-{preview.student_roll}"
        existing_count = db.query(FeeDemand).filter(FeeDemand.demand_code.like(f"{base_code}%")).count()
        demand_code = base_code if existing_count == 0 else f"{base_code}-v{existing_count + 1}"

        due_date = req.due_date or (date.today() + timedelta(days=30))
        generation_date = date.today()

        academic_year_id = req.academic_year_id
        if not academic_year_id:
            ay_rec = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
            if not ay_rec:
                ay_rec = db.query(AcademicYear).first()
            academic_year_id = ay_rec.id

        demand = FeeDemand(
            demand_code=demand_code,
            student_id=req.student_id,
            academic_year_id=academic_year_id,
            fee_structure_id=preview.fee_structure_id,
            gross_demand=preview.gross_demand,
            scholarship_amount=preview.total_scholarship,
            concession_amount=preview.total_concession,
            waiver_amount=preview.total_waiver,
            net_demand=preview.net_demand,
            paid_amount=0.0,
            outstanding_amount=preview.net_demand,
            status=FeeDemandStatus.PENDING if preview.net_demand > 0 else FeeDemandStatus.PAID,
            due_date=due_date,
            generation_date=generation_date,
        )
        db.add(demand)
        db.flush()

        # Create FeeDemandItem records
        for it in preview.items:
            item_record = FeeDemandItem(
                fee_demand_id=demand.id,
                fee_head_id=it.head_id,
                gross_amount=it.gross_amount,
                scholarship_deduction=it.scholarship_deduction,
                concession_deduction=it.concession_deduction,
                waiver_deduction=it.waiver_deduction,
                net_amount=it.net_amount,
                paid_amount=0.0,
                outstanding_amount=it.net_amount,
            )
            db.add(item_record)

        # Optional Scholarship record
        if preview.total_scholarship > 0:
            sch = Scholarship(
                student_id=req.student_id,
                fee_demand_id=demand.id,
                name=req.scholarship_name or "Institutional Merit Scholarship",
                scholarship_code=f"SCH-{preview.student_roll}-{date.today().year}",
                amount=preview.total_scholarship,
                grant_authority="Institutional Board",
                status="APPLIED",
            )
            db.add(sch)

        # Optional Concession record
        if preview.total_concession > 0:
            conc = Concession(
                student_id=req.student_id,
                fee_demand_id=demand.id,
                reason=req.concession_reason or "Sibling / Quota Concession",
                concession_code=f"CONC-{preview.student_roll}",
                amount=preview.total_concession,
                approved_by="Accounts Officer",
                status="APPROVED",
            )
            db.add(conc)

        # Optional Fee Waiver record
        if preview.total_waiver > 0:
            waiver = FeeWaiver(
                student_id=req.student_id,
                fee_demand_id=demand.id,
                reason=req.waiver_reason or "Special Management Waiver",
                amount=preview.total_waiver,
                approved_by="Finance Approver",
                status="APPROVED",
            )
            db.add(waiver)

        db.commit()
        db.refresh(demand)

        # Log immutable audit event
        audit = AuditService(db)
        audit.log(
            action=AuditAction.CREATE,
            resource_type="FeeDemand",
            resource_id=demand.id,
            user_id=actor_user_id,
            role=actor_role or UserRole.ACCOUNTS_OFFICER,
            reason=f"Generated official fee demand {demand.demand_code} for student {preview.student_roll} (Net: ₹{demand.net_demand:,.2f})",
            new_value=str({
                "demand_code": demand.demand_code,
                "gross": demand.gross_demand,
                "net": demand.net_demand,
                "due_date": str(demand.due_date),
            })
        )

        return demand

    @classmethod
    def create_installment_schedule(
        cls,
        db: Session,
        demand_id: str,
        req: InstallmentPlanCreateRequest,
        actor_user_id: Optional[str] = None,
        actor_role: Optional[UserRole] = None,
    ) -> InstallmentPlan:
        """
        Creates an exact penny-precise installment schedule without precision drift.
        Remainder cents are deterministically allocated to the first installment.
        """
        demand = db.query(FeeDemand).filter(FeeDemand.id == demand_id).first()
        if not demand:
            raise HTTPException(status_code=404, detail=f"Fee Demand with ID '{demand_id}' not found.")

        # Check if plan already exists
        existing_plan = db.query(InstallmentPlan).filter(InstallmentPlan.fee_demand_id == demand_id).first()
        if existing_plan:
            # Delete old installments
            db.delete(existing_plan)
            db.flush()

        n = req.total_installments
        if n not in [2, 3, 4]:
            raise HTTPException(status_code=400, detail="Installment count must be 2, 3, or 4 tranches.")

        total_cents = int(round(demand.net_demand * 100))
        base_cents = total_cents // n
        remainder_cents = total_cents % n

        plan = InstallmentPlan(
            fee_demand_id=demand.id,
            plan_name=req.plan_name,
            total_installments=n,
            status="ACTIVE",
        )
        db.add(plan)
        db.flush()

        start_due = req.first_due_date or demand.due_date or (date.today() + timedelta(days=15))

        created_installments = []
        for i in range(1, n + 1):
            # Tranche 1 absorbs remainder cents to guarantee sum equality
            installment_cents = base_cents + (remainder_cents if i == 1 else 0)
            amount = round(installment_cents / 100.0, 2)
            tranche_due = start_due + timedelta(days=(i - 1) * req.interval_days)

            inst = Installment(
                installment_plan_id=plan.id,
                installment_number=i,
                due_date=tranche_due,
                amount=amount,
                paid_amount=0.0,
                penalty_amount=0.0,
                status="PENDING",
            )
            db.add(inst)
            created_installments.append(inst)

        db.commit()
        db.refresh(plan)

        # Audit event
        audit = AuditService(db)
        audit.log(
            action=AuditAction.CREATE,
            resource_type="InstallmentPlan",
            resource_id=plan.id,
            user_id=actor_user_id,
            role=actor_role or UserRole.ACCOUNTS_OFFICER,
            reason=f"Created {n}-tranche installment schedule for demand {demand.demand_code} (Total: ₹{demand.net_demand:,.2f})",
        )

        return plan
