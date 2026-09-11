from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.users import User, Student
from app.models.fee_demands import FeeDemand, FeeDemandItem, InstallmentPlan
from app.models.enums import UserRole
from app.schemas.fee_demands import (
    FeeCalculationRequest,
    FeeCalculationPreviewResponse,
    FeeDemandCreateRequest,
    FeeDemandResponse,
    InstallmentPlanCreateRequest,
    InstallmentPlanResponse,
)
from app.services.fee_engine import FeeCalculationEngine

router = APIRouter(prefix="/fee-demands", tags=["Fee Demands & Calculation Engine"])

@router.post("/calculate", response_model=FeeCalculationPreviewResponse)
def calculate_fee_demand_preview(
    req: FeeCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Simulates and previews deterministic fee calculations across priority heads,
    scholarships, concessions, and waivers without mutating database state.
    """
    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and req.student_id == current_user.student.id):
            raise HTTPException(status_code=403, detail="Students can only simulate their own fee demand.")
    elif current_user.role == UserRole.PARENT:
        s = db.query(Student).filter(Student.id == req.student_id).first()
        if not (s and current_user.parent and s.parent_id == current_user.parent.id):
            raise HTTPException(status_code=403, detail="Parents can only simulate fee demands for their linked wards.")

    return FeeCalculationEngine.calculate_demand_preview(db, req)

@router.post("/generate", response_model=FeeDemandResponse)
def generate_official_fee_demand(
    req: FeeDemandCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ACCOUNTS_OFFICER, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)),
):
    """
    Generates and commits an official Fee Demand and its itemized head breakdown into the authoritative ledger.
    Restricted to Accounts Officer and Admin.
    """
    demand = FeeCalculationEngine.generate_official_demand(
        db=db,
        req=req,
        actor_user_id=current_user.id,
        actor_role=current_user.role,
    )

    return format_demand_response(demand, db)

@router.get("/{demand_id}", response_model=FeeDemandResponse)
def get_fee_demand_by_id(
    demand_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves an itemized Fee Demand with fee head priorities and balance breakdown."""
    demand = (
        db.query(FeeDemand)
        .options(
            joinedload(FeeDemand.student).joinedload(Student.user),
            joinedload(FeeDemand.student).joinedload(Student.program),
            joinedload(FeeDemand.academic_year),
            joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
        )
        .filter(FeeDemand.id == demand_id)
        .first()
    )
    if not demand:
        raise HTTPException(status_code=404, detail=f"Fee demand '{demand_id}' not found.")

    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and demand.student_id == current_user.student.id):
            raise HTTPException(status_code=403, detail="Access denied to other students' fee demands.")
    elif current_user.role == UserRole.PARENT:
        if not (current_user.parent and demand.student and demand.student.parent_id == current_user.parent.id):
            raise HTTPException(status_code=403, detail="Access denied to other students' fee demands.")

    return format_demand_response(demand, db)

@router.get("/student/{student_id}", response_model=List[FeeDemandResponse])
def get_student_fee_demands(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves all fee demands issued to a student."""
    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and student_id == current_user.student.id):
            raise HTTPException(status_code=403, detail="Access denied to other students' fee demands.")
    elif current_user.role == UserRole.PARENT:
        s = db.query(Student).filter(Student.id == student_id).first()
        if not (s and current_user.parent and s.parent_id == current_user.parent.id):
            raise HTTPException(status_code=403, detail="Access denied to other students' fee demands.")

    demands = (
        db.query(FeeDemand)
        .options(
            joinedload(FeeDemand.student).joinedload(Student.user),
            joinedload(FeeDemand.student).joinedload(Student.program),
            joinedload(FeeDemand.academic_year),
            joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
        )
        .filter(FeeDemand.student_id == student_id)
        .order_by(FeeDemand.generation_date.desc())
        .all()
    )
    return [format_demand_response(d, db) for d in demands]

@router.post("/{demand_id}/installments", response_model=InstallmentPlanResponse)
def create_demand_installment_plan(
    demand_id: str,
    req: InstallmentPlanCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ACCOUNTS_OFFICER, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)),
):
    """
    Creates an exact penny-partitioned installment plan for a fee demand.
    """
    plan = FeeCalculationEngine.create_installment_schedule(
        db=db,
        demand_id=demand_id,
        req=req,
        actor_user_id=current_user.id,
        actor_role=current_user.role,
    )
    return plan

@router.get("/{demand_id}/installments", response_model=InstallmentPlanResponse)
def get_demand_installment_plan(
    demand_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves active installment plan and tranche due dates for a fee demand."""
    demand = db.query(FeeDemand).filter(FeeDemand.id == demand_id).first()
    if not demand:
        raise HTTPException(status_code=404, detail=f"Fee demand '{demand_id}' not found.")

    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and demand.student_id == current_user.student.id):
            raise HTTPException(status_code=403, detail="Access denied to other students' installment plans.")
    elif current_user.role == UserRole.PARENT:
        s = db.query(Student).filter(Student.id == demand.student_id).first()
        if not (s and current_user.parent and s.parent_id == current_user.parent.id):
            raise HTTPException(status_code=403, detail="Access denied to other students' installment plans.")

    plan = (
        db.query(InstallmentPlan)
        .options(joinedload(InstallmentPlan.installments))
        .filter(InstallmentPlan.fee_demand_id == demand_id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="No active installment plan configured for this demand.")
    return plan

def format_demand_response(demand: FeeDemand, db: Session) -> Dict[str, Any]:
    """Helper to convert FeeDemand ORM into serializable dictionary."""
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

    return {
        "id": demand.id,
        "demand_code": demand.demand_code,
        "student_id": demand.student_id,
        "student_roll": demand.student.roll_no if demand.student else "N/A",
        "student_name": demand.student.user.full_name if (demand.student and demand.student.user) else "Student",
        "program_code": demand.student.program.code if (demand.student and demand.student.program) else "N/A",
        "academic_year": demand.academic_year.year_code if demand.academic_year else "2026-27",
        "gross_demand": demand.gross_demand,
        "scholarship_amount": demand.scholarship_amount,
        "concession_amount": demand.concession_amount,
        "waiver_amount": demand.waiver_amount,
        "net_demand": demand.net_demand,
        "paid_amount": demand.paid_amount,
        "outstanding_amount": demand.outstanding_amount,
        "status": demand.status,
        "due_date": demand.due_date,
        "generation_date": demand.generation_date,
        "items": items,
    }
