import hmac
import hashlib
import json
from decimal import Decimal
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.users import Student, User
from app.models.payments import Payment
from app.models.enums import PaymentChannel, PaymentStatus, AuditAction, UserRole
from app.schemas.integrations import WebhookPaymentPayload, WebhookResponse
from app.services.payment_service import PaymentService
from app.schemas.payments import PaymentCreateRequest
from app.services.audit_service import AuditService

# Default institutional webhook shared secrets
DEFAULT_WEBHOOK_SECRETS = {
    "RAZORPAY": "rzp_sec_vignan_university_2026_finance",
    "STRIPE": "whsec_stripe_vignan_institution_live_secret",
    "BILLDESK": "bd_hmac_secret_key_vignan_feemgmt",
    "EASEBUZZ": "eb_salt_vignan_core_financial_secret"
}

class WebhookService:
    @staticmethod
    def verify_signature(
        gateway: str,
        raw_body: bytes,
        received_signature: str,
        secret: str = None
    ) -> bool:
        """
        Validates HMAC SHA-256 signature for incoming payment webhook payloads.
        """
        gw = gateway.upper()
        webhook_secret = secret or DEFAULT_WEBHOOK_SECRETS.get(gw, "default_vignan_webhook_secret")
        
        expected_sig = hmac.new(
            webhook_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_sig, received_signature.strip())

    @classmethod
    def process_gateway_webhook(
        cls,
        db: Session,
        payload: WebhookPaymentPayload,
        verified_by_signature: bool = True
    ) -> WebhookResponse:
        """
        Idempotent payment webhook processing pipeline.
        1. Checks for duplicate transaction ID.
        2. Resolves student.
        3. Executes deterministic PaymentService priority allocation.
        4. Logs append-only audit trail.
        """
        # 1. Idempotency Check
        existing_payment = db.query(Payment).filter(
            Payment.transaction_id == payload.transaction_id
        ).first()

        if existing_payment:
            return WebhookResponse(
                status="DUPLICATE_IGNORED",
                message=f"Transaction '{payload.transaction_id}' was previously processed and reconciled.",
                payment_id=existing_payment.id,
                receipt_number=existing_payment.receipt_number,
                allocated_breakdown=[]
            )

        # 2. Resolve Student
        student = None
        if payload.student_id:
            student = db.query(Student).filter(Student.id == payload.student_id).first()
        if not student and payload.roll_no:
            student = db.query(Student).filter(Student.roll_no.ilike(payload.roll_no.strip())).first()

        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student identifier not found for roll '{payload.roll_no}' or ID '{payload.student_id}'."
            )

        # 3. Create Payment via Deterministic PaymentService
        # Find system user or accounts user for audit actor
        system_user = db.query(User).filter(User.role.in_([UserRole.SYSTEM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTS_OFFICER])).first()

        payment_channel_map = {
            "RAZORPAY": PaymentChannel.ONLINE_GATEWAY,
            "STRIPE": PaymentChannel.ONLINE_GATEWAY,
            "BILLDESK": PaymentChannel.ONLINE,
            "EASEBUZZ": PaymentChannel.UPI,
            "ONLINE_GATEWAY": PaymentChannel.ONLINE_GATEWAY
        }
        channel = payment_channel_map.get(payload.gateway.upper(), PaymentChannel.ONLINE_GATEWAY)

        payment_req = PaymentCreateRequest(
            student_id=student.id,
            amount=payload.amount,
            channel=channel,
            transaction_id=payload.transaction_id,
            utr_number=payload.transaction_id,
            gateway_name=payload.gateway.upper(),
            notes=f"Processed via Gateway Webhook [{payload.gateway}] • Event: {payload.event}"
        )

        payment_dict = PaymentService.record_payment(
            payload=payment_req,
            current_user=system_user,
            db=db
        )

        # 4. Extract allocation summary
        payment_obj = payment_dict.get("payment")
        receipt_data = payment_dict.get("receipt")
        raw_allocs = payment_dict.get("allocations") or []
        allocations_list = []
        for a in raw_allocs:
            if isinstance(a, dict):
                allocations_list.append(a)
            else:
                head_name = "Fee Head"
                if hasattr(a, "fee_demand_item") and a.fee_demand_item and a.fee_demand_item.fee_head:
                    head_name = a.fee_demand_item.fee_head.name
                allocations_list.append({
                    "head_name": head_name,
                    "allocated_amount": float(getattr(a, "allocated_amount", 0.0))
                })

        receipt_no = getattr(payment_obj, "receipt_number", None) or (receipt_data.get("receipt_number") if isinstance(receipt_data, dict) else None) or getattr(payment_obj, "payment_ref", "REC-AUTO")
        payment_id = getattr(payment_obj, "id", None)

        # 5. Audit Log
        AuditService.log_event(
            db=db,
            action=AuditAction.CREATE,
            resource_type="WEBHOOK_PAYMENT_PROCESSED",
            resource_id=payment_id,
            user_id=system_user.id if system_user else None,
            role=UserRole.SYSTEM_ADMIN,
            details={
                "gateway": payload.gateway,
                "event": payload.event,
                "transaction_id": payload.transaction_id,
                "amount": payload.amount,
                "student_roll": student.roll_no,
                "receipt_number": receipt_no
            }
        )

        return WebhookResponse(
            status="SUCCESS",
            message=f"Payment of ₹{payload.amount:,.2f} processed and allocated successfully.",
            payment_id=payment_id,
            receipt_number=receipt_no,
            allocated_breakdown=allocations_list
        )
