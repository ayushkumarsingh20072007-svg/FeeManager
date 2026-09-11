"""
Official Fee Demand Generator — Agent 40.
Generates authoritative FeeDemand and itemized FeeDemandItem records from deterministic fee calculations.
Guarantees idempotency (re-running generation returns existing active demand without duplicate financial obligations).
Logs append-only audit events.
"""
from decimal import Decimal
from datetime import date, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.users import Student
from app.models.fee_demands import FeeDemand, FeeDemandItem, InstallmentPlan, Installment, Scholarship, Concession, FeeWaiver
from app.models.enums import FeeDemandStatus, AuditAction, UserRole
from app.services.fee_calculator import FeeCalculator, to_decimal
from app.services.audit_service import AuditService

class DemandGenerator:

    @classmethod
    def generate_demand(
        cls,
        db: Session,
        student_id: str,
        academic_year_id: Optional[str] = None,
        fee_structure_id: Optional[str] = None,
        installment_count: Optional[int] = None,
        due_date: Optional[date] = None,
        actor_user_id: Optional[str] = None,
        actor_role: Optional[UserRole] = None,
    ) -> Dict[str, Any]:
        """
        Generates and commits an official FeeDemand.
        Idempotent: If an active demand already exists for the student and academic year, it is returned.
        """
        # 1. Perform deterministic calculation
        calc = FeeCalculator.calculate_fee(
            db=db,
            student_id=student_id,
            academic_year_id=academic_year_id,
            fee_structure_id=fee_structure_id,
            installment_count=installment_count,
        )

        target_academic_year_id = calc["academic_year_id"]
        target_fee_structure_id = calc["fee_structure_id"]

        # 2. Idempotency Check: Look for existing active demand
        existing_demand = db.query(FeeDemand).options(
            joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
            joinedload(FeeDemand.scholarships),
            joinedload(FeeDemand.concessions),
            joinedload(FeeDemand.waivers),
            joinedload(FeeDemand.installment_plan).joinedload(InstallmentPlan.installments),
            joinedload(FeeDemand.student).joinedload(Student.user),
        ).filter(
            FeeDemand.student_id == student_id,
            FeeDemand.academic_year_id == target_academic_year_id,
            FeeDemand.fee_structure_id == target_fee_structure_id,
            FeeDemand.status != FeeDemandStatus.CANCELLED,
        ).first()

        if existing_demand:
            return cls._format_demand_output(existing_demand, is_reused=True)

        # 3. Create New Official Demand
        if not due_date:
            due_date = date.today() + timedelta(days=30)

        student = db.query(Student).filter(Student.id == student_id).first()
        enrollment_id = student.enrollments[0].id if (student and student.enrollments) else None

        demand_code = f"FEE-2026-{calc['roll_no']}"
        # Ensure demand_code uniqueness if another exists
        dup_check = db.query(FeeDemand).filter(FeeDemand.demand_code == demand_code).first()
        if dup_check:
            demand_code = f"FEE-2026-{calc['roll_no']}-{date.today().strftime('%m%d')}"

        new_demand = FeeDemand(
            demand_code=demand_code,
            student_id=student_id,
            enrollment_id=enrollment_id,
            academic_year_id=target_academic_year_id,
            fee_structure_id=target_fee_structure_id,
            gross_demand=calc["gross_fee"],
            scholarship_amount=calc["scholarship_amount"],
            concession_amount=calc["concession_amount"],
            waiver_amount=calc["waiver_amount"],
            net_demand=calc["net_fee"],
            paid_amount=0.0,
            outstanding_amount=calc["net_fee"],
            status=FeeDemandStatus.PENDING,
            due_date=due_date,
            generation_date=date.today(),
        )
        db.add(new_demand)
        db.flush()

        # 4. Create Itemized FeeDemandItems
        # Calculate reduction deduction per head (proportional or head priority)
        total_gross = to_decimal(calc["gross_fee"])
        total_red = to_decimal(calc["total_reductions"])

        for it in calc["fee_items"]:
            item_gross = to_decimal(it["amount"])
            # Allocate deduction proportionally across heads
            if total_gross > Decimal("0.00") and total_red > Decimal("0.00"):
                item_deduction = ((item_gross / total_gross) * total_red).quantize(Decimal("0.01"))
            else:
                item_deduction = Decimal("0.00")

            item_net = max(Decimal("0.00"), item_gross - item_deduction)

            d_item = FeeDemandItem(
                fee_demand_id=new_demand.id,
                fee_head_id=it["fee_head_id"],
                gross_amount=float(item_gross),
                scholarship_deduction=float(item_deduction) if calc["scholarship_amount"] > 0 else 0.0,
                concession_deduction=0.0,
                waiver_deduction=0.0,
                net_amount=float(item_net),
                paid_amount=0.0,
                outstanding_amount=float(item_net),
            )
            db.add(d_item)

        # 5. Link Approved Scholarships/Concessions/Waivers
        db.query(Scholarship).filter(Scholarship.student_id == student_id, Scholarship.fee_demand_id.is_(None)).update(
            {"fee_demand_id": new_demand.id}
        )
        db.query(Concession).filter(Concession.student_id == student_id, Concession.fee_demand_id.is_(None)).update(
            {"fee_demand_id": new_demand.id}
        )
        db.query(FeeWaiver).filter(FeeWaiver.student_id == student_id, FeeWaiver.fee_demand_id.is_(None)).update(
            {"fee_demand_id": new_demand.id}
        )

        # 6. Create Installment Plan if requested
        if calc["installment_schedule"]:
            plan = InstallmentPlan(
                fee_demand_id=new_demand.id,
                plan_name=f"{len(calc['installment_schedule'])}-Tranche Academic Fee Plan",
                total_installments=len(calc["installment_schedule"]),
                status="ACTIVE",
            )
            db.add(plan)
            db.flush()

            for t in calc["installment_schedule"]:
                tranche_due = date.today() + timedelta(days=30 * t["installment_number"])
                inst = Installment(
                    installment_plan_id=plan.id,
                    installment_number=t["installment_number"],
                    due_date=tranche_due,
                    amount=t["amount"],
                    paid_amount=0.0,
                    status="PENDING",
                )
                db.add(inst)

        # 7. Audit Logging
        if actor_user_id:
            audit_service = AuditService(db)
            audit_service.log(
                action=AuditAction.CREATE,
                resource_type="FEE_DEMAND",
                resource_id=new_demand.id,
                reason=f"Generated official fee demand {new_demand.demand_code} for {calc['roll_no']}",
                user_id=actor_user_id,
                role=actor_role or UserRole.ACCOUNTS_OFFICER,
                new_value={
                    "demand_code": new_demand.demand_code,
                    "gross_demand": new_demand.gross_demand,
                    "net_demand": new_demand.net_demand,
                },
            )

        db.commit()
        db.refresh(new_demand)

        return cls._format_demand_output(new_demand, is_reused=False)

    @staticmethod
    def _format_demand_output(demand: FeeDemand, is_reused: bool = False) -> Dict[str, Any]:
        """Formats FeeDemand entity into a structured response dictionary."""
        items = []
        for it in sorted(demand.items, key=lambda x: x.fee_head.priority_order if x.fee_head else 99):
            items.append({
                "id": it.id,
                "head_code": it.fee_head.code if it.fee_head else "OTHER",
                "head_name": it.fee_head.name if it.fee_head else "Fee Head",
                "gross_amount": it.gross_amount,
                "scholarship_deduction": it.scholarship_deduction,
                "concession_deduction": it.concession_deduction,
                "waiver_deduction": it.waiver_deduction,
                "net_amount": it.net_amount,
                "paid_amount": it.paid_amount,
                "outstanding_amount": it.outstanding_amount,
            })

        installments = []
        if demand.installment_plan and demand.installment_plan.installments:
            for inst in demand.installment_plan.installments:
                installments.append({
                    "installment_number": inst.installment_number,
                    "due_date": str(inst.due_date),
                    "amount": inst.amount,
                    "paid_amount": inst.paid_amount,
                    "status": inst.status,
                })

        return {
            "demand_id": demand.id,
            "demand_code": demand.demand_code,
            "student_id": demand.student_id,
            "student_roll": demand.student.roll_no if demand.student else "N/A",
            "student_name": demand.student.user.full_name if (demand.student and demand.student.user) else "Student",
            "program_code": demand.student.program.code if (demand.student and demand.student.program) else "N/A",
            "academic_year": demand.academic_year.year_code if demand.academic_year else "2026-27",
            "fee_structure_id": demand.fee_structure_id,
            "gross_demand": demand.gross_demand,
            "scholarship_amount": demand.scholarship_amount,
            "concession_amount": demand.concession_amount,
            "waiver_amount": demand.waiver_amount,
            "total_reductions": demand.scholarship_amount + demand.concession_amount + demand.waiver_amount,
            "net_demand": demand.net_demand,
            "paid_amount": demand.paid_amount,
            "outstanding_amount": demand.outstanding_amount,
            "status": demand.status.value if hasattr(demand.status, "value") else str(demand.status),
            "due_date": str(demand.due_date),
            "generation_date": str(demand.generation_date),
            "fee_items": items,
            "installments": installments,
            "is_reused": is_reused,
        }
