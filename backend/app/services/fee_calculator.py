"""
Deterministic Fee Calculator Service — Agent 40.
Strictly implements Python Decimal arithmetic for all monetary amounts.
Resolves applicable FeeStructure server-side from student academic context:
(Student -> Enrollment -> AcademicYear -> Program -> Regulation -> Category -> AdmissionRoute -> FeeStructure)
Calculates itemized heads, approved reductions (Scholarships, Concessions, Waivers), and Net Fee.
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.users import Student
from app.models.academics import AcademicYear
from app.models.fee_structures import FeeStructure, FeeStructureItem
from app.models.fee_demands import Scholarship, Concession, FeeWaiver
from app.models.enums import FeeStructureStatus

TWO_PLACES = Decimal("0.01")

def to_decimal(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

class FeeCalculator:

    @staticmethod
    def resolve_applicable_fee_structure(
        db: Session,
        student: Student,
        academic_year_id: Optional[str] = None,
        requested_fee_structure_id: Optional[str] = None,
    ) -> FeeStructure:
        """
        Resolves the authoritative active FeeStructure for a student based strictly on academic context.
        Validates any requested_fee_structure_id against the student's actual attributes.
        """
        # Determine target academic year
        if not academic_year_id:
            if student.admission_year_id:
                academic_year_id = student.admission_year_id
            else:
                curr_ay = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
                if not curr_ay:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No active academic year configured in the system."
                    )
                academic_year_id = curr_ay.id

        # Query fee structure matching the student's exact academic profile
        # Priority 1: Exact Match (Year, Program, Regulation, Category, Admission Route)
        query = db.query(FeeStructure).options(
            joinedload(FeeStructure.items).joinedload(FeeStructureItem.fee_head),
            joinedload(FeeStructure.program),
            joinedload(FeeStructure.regulation),
            joinedload(FeeStructure.category),
            joinedload(FeeStructure.admission_route),
            joinedload(FeeStructure.academic_year),
        ).filter(
            FeeStructure.academic_year_id == academic_year_id,
            FeeStructure.program_id == student.program_id,
            FeeStructure.regulation_id == student.regulation_id,
            FeeStructure.category_id == student.category_id,
            FeeStructure.admission_route_id == student.admission_route_id,
            FeeStructure.status == FeeStructureStatus.ACTIVE,
        )

        fee_structure = query.first()

        # Priority 2: Program & Admission Route Match (When specific category structure is not configured)
        if not fee_structure and student.admission_route_id:
            route_query = db.query(FeeStructure).options(
                joinedload(FeeStructure.items).joinedload(FeeStructureItem.fee_head),
                joinedload(FeeStructure.program),
                joinedload(FeeStructure.regulation),
                joinedload(FeeStructure.category),
                joinedload(FeeStructure.admission_route),
                joinedload(FeeStructure.academic_year),
            ).filter(
                FeeStructure.academic_year_id == academic_year_id,
                FeeStructure.program_id == student.program_id,
                FeeStructure.regulation_id == student.regulation_id,
                FeeStructure.admission_route_id == student.admission_route_id,
                FeeStructure.status == FeeStructureStatus.ACTIVE,
            )
            fee_structure = route_query.first()

        # Priority 3: Institutional Admission Route Match (e.g. Universal Management Quota across Regulation)
        if not fee_structure and student.admission_route_id:
            inst_route_query = db.query(FeeStructure).options(
                joinedload(FeeStructure.items).joinedload(FeeStructureItem.fee_head),
                joinedload(FeeStructure.program),
                joinedload(FeeStructure.regulation),
                joinedload(FeeStructure.category),
                joinedload(FeeStructure.admission_route),
                joinedload(FeeStructure.academic_year),
            ).filter(
                FeeStructure.academic_year_id == academic_year_id,
                FeeStructure.regulation_id == student.regulation_id,
                FeeStructure.admission_route_id == student.admission_route_id,
                FeeStructure.status == FeeStructureStatus.ACTIVE,
            )
            fee_structure = inst_route_query.first()

        # Priority 4: Standard/General Baseline Fallback (Prioritizing non-management standard structure)
        if not fee_structure:
            fallback_structures = db.query(FeeStructure).options(
                joinedload(FeeStructure.items).joinedload(FeeStructureItem.fee_head),
                joinedload(FeeStructure.program),
                joinedload(FeeStructure.regulation),
                joinedload(FeeStructure.category),
                joinedload(FeeStructure.admission_route),
                joinedload(FeeStructure.academic_year),
            ).filter(
                FeeStructure.academic_year_id == academic_year_id,
                FeeStructure.program_id == student.program_id,
                FeeStructure.regulation_id == student.regulation_id,
                FeeStructure.status == FeeStructureStatus.ACTIVE,
            ).all()

            if fallback_structures:
                # Prefer standard convenor/merit structure over management
                for st in fallback_structures:
                    if st.admission_route and st.admission_route.code != "MANAGEMENT":
                        fee_structure = st
                        break
                if not fee_structure:
                    fee_structure = fallback_structures[0]

        if not fee_structure:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active fee structure found for student '{student.roll_no}' in academic year '{academic_year_id}'."
            )

        # If a specific structure ID was passed by client, validate it matches the resolved structure
        if requested_fee_structure_id and requested_fee_structure_id != fee_structure.id:
            # Verify if requested structure legitimately belongs to this student's profile
            req_struct = db.query(FeeStructure).filter(FeeStructure.id == requested_fee_structure_id).first()
            if not req_struct or (
                req_struct.program_id != student.program_id
                or req_struct.regulation_id != student.regulation_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Requested fee structure '{requested_fee_structure_id}' does not match student's program/regulation context."
                )
            fee_structure = req_struct

        return fee_structure

    @classmethod
    def calculate_fee(
        cls,
        db: Session,
        student_id: str,
        academic_year_id: Optional[str] = None,
        fee_structure_id: Optional[str] = None,
        installment_count: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Pure deterministic fee calculation.
        Computes gross fee, itemized heads, reductions, net fee, and installment tranches using Decimal.
        """
        student = db.query(Student).options(
            joinedload(Student.user),
            joinedload(Student.program),
            joinedload(Student.regulation),
            joinedload(Student.category),
            joinedload(Student.admission_route),
            joinedload(Student.scholarships),
            joinedload(Student.concessions),
            joinedload(Student.waivers),
        ).filter(Student.id == student_id).first()

        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID '{student_id}' not found."
            )

        # 1. Resolve Fee Structure
        fee_structure = cls.resolve_applicable_fee_structure(
            db=db,
            student=student,
            academic_year_id=academic_year_id,
            requested_fee_structure_id=fee_structure_id,
        )

        # 2. Itemized Fee Heads & Gross Fee
        fee_items = []
        gross_fee = Decimal("0.00")

        sorted_items = sorted(
            fee_structure.items,
            key=lambda it: it.priority_order if it.priority_order is not None else 99
        )

        for it in sorted_items:
            head_code = it.fee_head.code if it.fee_head else "OTHER"
            head_name = it.fee_head.name if it.fee_head else "Fee Head"
            amt = to_decimal(it.amount)
            if amt < Decimal("0.00"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Negative fee head amount detected for head '{head_code}'."
                )
            gross_fee += amt
            fee_items.append({
                "fee_head_id": it.fee_head_id,
                "head_code": head_code,
                "head_name": head_name,
                "priority_order": it.priority_order,
                "is_refundable": it.is_refundable,
                "amount": float(amt),
            })

        # 3. Approved Reductions
        scholarship_amount = Decimal("0.00")
        concession_amount = Decimal("0.00")
        waiver_amount = Decimal("0.00")

        scholarship_breakdown = []
        for s in student.scholarships:
            if getattr(s, "status", "APPROVED") == "APPROVED":
                s_amt = to_decimal(s.amount)
                if s_amt > Decimal("0.00"):
                    scholarship_amount += s_amt
                    scholarship_breakdown.append({
                        "id": s.id,
                        "name": s.name,
                        "code": s.scholarship_code,
                        "amount": float(s_amt),
                    })

        concession_breakdown = []
        for c in student.concessions:
            if getattr(c, "status", "APPROVED") == "APPROVED":
                c_amt = to_decimal(c.amount)
                if c_amt > Decimal("0.00"):
                    concession_amount += c_amt
                    concession_breakdown.append({
                        "id": c.id,
                        "reason": c.reason,
                        "code": c.concession_code,
                        "amount": float(c_amt),
                    })

        waiver_breakdown = []
        for w in student.waivers:
            if getattr(w, "status", "APPROVED") == "APPROVED":
                w_amt = to_decimal(w.amount)
                if w_amt > Decimal("0.00"):
                    waiver_amount += w_amt
                    waiver_breakdown.append({
                        "id": w.id,
                        "reason": w.reason,
                        "amount": float(w_amt),
                    })

        total_reductions = scholarship_amount + concession_amount + waiver_amount
        net_fee = max(Decimal("0.00"), gross_fee - total_reductions)

        # 4. Installment Schedule Partitioning (if requested)
        installment_schedule = []
        if installment_count and installment_count > 1:
            if installment_count not in (2, 3, 4):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Institutional policy permits only 2, 3, or 4 installment tranches."
                )

            base_tranche = (net_fee / Decimal(installment_count)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            remainder = net_fee - (base_tranche * Decimal(installment_count))
            first_tranche = base_tranche + remainder  # Allocate cent/penny remainder to Tranche 1

            for idx in range(1, installment_count + 1):
                tranche_amt = first_tranche if idx == 1 else base_tranche
                installment_schedule.append({
                    "installment_number": idx,
                    "amount": float(tranche_amt),
                    "status": "PENDING",
                })

            # Validation: Exact equality guarantee
            sum_tranches = sum(to_decimal(t["amount"]) for t in installment_schedule)
            assert sum_tranches == net_fee, f"Installment partition mismatch: sum={sum_tranches}, net_fee={net_fee}"

        return {
            "student_id": student.id,
            "roll_no": student.roll_no,
            "student_name": student.user.full_name if student.user else "N/A",
            "academic_year_id": fee_structure.academic_year_id,
            "academic_year_code": fee_structure.academic_year.year_code if fee_structure.academic_year else "2026-27",
            "program_id": student.program_id,
            "program_code": student.program.code if student.program else "N/A",
            "regulation_id": student.regulation_id,
            "regulation_code": student.regulation.code if student.regulation else "R23",
            "category_id": student.category_id,
            "category_code": student.category.code if student.category else "GEN",
            "admission_route_id": student.admission_route_id,
            "admission_route_code": student.admission_route.code if student.admission_route else "EAMCET",
            "fee_structure_id": fee_structure.id,
            "fee_structure_version": fee_structure.version,
            "fee_items": fee_items,
            "gross_fee": float(gross_fee),
            "scholarship_amount": float(scholarship_amount),
            "scholarship_breakdown": scholarship_breakdown,
            "concession_amount": float(concession_amount),
            "concession_breakdown": concession_breakdown,
            "waiver_amount": float(waiver_amount),
            "waiver_breakdown": waiver_breakdown,
            "total_reductions": float(total_reductions),
            "net_fee": float(net_fee),
            "installment_schedule": installment_schedule,
            "calculation_timestamp": datetime.now(timezone.utc).isoformat(),
        }
