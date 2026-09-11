"""
Fee Calculation & Demand Generation API Routes — Agent 40.
Provides deterministic calculation previews, idempotent demand generation, and student demand retrieval.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.users import User, Student
from app.models.fee_demands import FeeDemand, FeeDemandItem, InstallmentPlan
from app.models.enums import UserRole
from app.schemas.fees import (
    FeeCalculateRequest,
    FeeCalculateResponse,
    FeeDemandGenerateRequest,
    FeeDemandDetailResponse,
)
from app.services.fee_calculator import FeeCalculator
from app.services.demand_generator import DemandGenerator

router = APIRouter(prefix="", tags=["Fee Calculations & Demand Generator"])

@router.post("/fees/calculate", response_model=FeeCalculateResponse)
def calculate_fee_preview(
    req: FeeCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Simulates and previews deterministic fee calculations without mutating database state.
    Derives applicable fee structure server-side.
    """
    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and req.student_id == current_user.student.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students can only simulate their own fee calculation."
            )
    elif current_user.role == UserRole.PARENT:
        s = db.query(Student).filter(Student.id == req.student_id).first()
        if not (s and current_user.parent and s.parent_id == current_user.parent.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Parents can only simulate fee calculations for their linked wards."
            )

    return FeeCalculator.calculate_fee(
        db=db,
        student_id=req.student_id,
        academic_year_id=req.academic_year_id,
        fee_structure_id=req.fee_structure_id,
        installment_count=req.installment_count,
    )

@router.post("/fees/demands/generate", response_model=FeeDemandDetailResponse)
def generate_official_demand(
    req: FeeDemandGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ACCOUNTS_OFFICER, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)),
):
    """
    Generates and commits an official Fee Demand and its itemized head breakdown into the authoritative ledger.
    Idempotent: Returns existing active demand if one already exists.
    """
    return DemandGenerator.generate_demand(
        db=db,
        student_id=req.student_id,
        academic_year_id=req.academic_year_id,
        fee_structure_id=req.fee_structure_id,
        installment_count=req.installment_count,
        due_date=req.due_date,
        actor_user_id=current_user.id,
        actor_role=current_user.role,
    )

@router.get("/fees/demands/{demand_id}", response_model=FeeDemandDetailResponse)
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
            joinedload(FeeDemand.installment_plan).joinedload(InstallmentPlan.installments),
        )
        .filter(FeeDemand.id == demand_id)
        .first()
    )
    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fee demand '{demand_id}' not found."
        )

    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and demand.student_id == current_user.student.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to other students' fee demands."
            )
    elif current_user.role == UserRole.PARENT:
        if not (current_user.parent and demand.student and demand.student.parent_id == current_user.parent.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to other students' fee demands."
            )

    return DemandGenerator._format_demand_output(demand, is_reused=False)

@router.get("/students/{student_id}/fee-preview", response_model=FeeCalculateResponse)
def get_student_fee_preview(
    student_id: str,
    academic_year_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves backend-authoritative fee preview for a student."""
    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and student_id == current_user.student.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students can only access their own fee preview."
            )
    elif current_user.role == UserRole.PARENT:
        s = db.query(Student).filter(Student.id == student_id).first()
        if not (s and current_user.parent and s.parent_id == current_user.parent.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Parents can only access fee previews for their linked wards."
            )

    return FeeCalculator.calculate_fee(
        db=db,
        student_id=student_id,
        academic_year_id=academic_year_id,
    )

@router.get("/students/{student_id}/fee-demands", response_model=List[FeeDemandDetailResponse])
def get_student_fee_demands(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves all fee demands issued to a student with server-side RBAC scoping."""
    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and student_id == current_user.student.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to other students' fee demands."
            )
    elif current_user.role == UserRole.PARENT:
        s = db.query(Student).filter(Student.id == student_id).first()
        if not (s and current_user.parent and s.parent_id == current_user.parent.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to other students' fee demands."
            )

    demands = (
        db.query(FeeDemand)
        .options(
            joinedload(FeeDemand.student).joinedload(Student.user),
            joinedload(FeeDemand.student).joinedload(Student.program),
            joinedload(FeeDemand.academic_year),
            joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
            joinedload(FeeDemand.installment_plan).joinedload(InstallmentPlan.installments),
        )
        .filter(FeeDemand.student_id == student_id)
        .order_by(FeeDemand.generation_date.desc())
        .all()
    )
    return [DemandGenerator._format_demand_output(d, is_reused=False) for d in demands]
