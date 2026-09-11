import io
import re
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.users import User, Student
from app.models.payments import Payment
from app.models.enums import UserRole, AuditAction
from app.schemas.fees import ReceiptResponse
from app.services.receipt_generator import ReceiptGenerator
from app.services.audit_service import AuditService

router = APIRouter(prefix="/payments", tags=["Fee Receipts & PDF Downloads"])

def _check_payment_access(payment: Payment, current_user: User, db: Session):
    """Enforces strict server-side authorization for receipt access."""
    if current_user.role == UserRole.STUDENT:
        if not (current_user.student and payment.student_id == current_user.student.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access another student's fee receipt."
            )
    elif current_user.role == UserRole.PARENT:
        s = payment.student or db.query(Student).filter(Student.id == payment.student_id).first()
        if not (s and current_user.parent and s.parent_id == current_user.parent.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access another student's fee receipt."
            )

@router.get("/{payment_id}/receipt", response_model=ReceiptResponse)
def get_payment_receipt(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves structured fee receipt metadata and accounting breakdown."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment record '{payment_id}' not found."
        )

    _check_payment_access(payment, current_user, db)

    return ReceiptGenerator.get_or_create_receipt(db, payment_id)

@router.get("/{payment_id}/receipt/pdf")
def download_payment_receipt_pdf(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates and streams an official, printable ReportLab PDF fee receipt.
    Enforces strict role-based data isolation.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment record '{payment_id}' not found."
        )

    _check_payment_access(payment, current_user, db)

    receipt_data = ReceiptGenerator.get_or_create_receipt(db, payment_id)
    pdf_bytes = ReceiptGenerator.generate_receipt_pdf(db, payment_id)

    raw_receipt_number = str(receipt_data.get("receipt_number", "RECEIPT"))
    safe_receipt_number = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_receipt_number)
    filename = f"fee_receipt_{safe_receipt_number}.pdf"

    # Audit Logging for official receipt download
    audit_service = AuditService(db)
    audit_service.log(
        action=AuditAction.READ,
        resource_type="RECEIPT_PDF",
        resource_id=receipt_data.get("receipt_id", payment_id),
        reason=f"Generated and downloaded official PDF receipt {safe_receipt_number}",
        user_id=current_user.id,
        role=current_user.role,
        new_value={"payment_id": payment_id, "receipt_number": safe_receipt_number},
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )
