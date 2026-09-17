from fastapi import APIRouter, Depends, Request, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas.integrations import WebhookPaymentPayload, WebhookResponse
from app.services.webhook_service import WebhookService

router = APIRouter(prefix="/webhooks", tags=["Payment Gateway Webhooks"])

@router.post("/payment", response_model=WebhookResponse)
async def handle_payment_webhook(
    request: Request,
    payload: WebhookPaymentPayload,
    x_razorpay_signature: Optional[str] = Header(None),
    x_stripe_signature: Optional[str] = Header(None),
    x_webhook_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> WebhookResponse:
    """
    Receives and processes payment gateway webhooks with HMAC SHA-256 signature verification.
    """
    received_sig = x_razorpay_signature or x_stripe_signature or x_webhook_signature
    raw_body = await request.body()

    if received_sig:
        is_valid = WebhookService.verify_signature(
            gateway=payload.gateway,
            raw_body=raw_body,
            received_signature=received_sig
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook HMAC SHA-256 signature."
            )

    return WebhookService.process_gateway_webhook(db=db, payload=payload)

@router.post("/simulate", response_model=WebhookResponse)
def simulate_gateway_webhook(
    payload: WebhookPaymentPayload,
    db: Session = Depends(get_db)
) -> WebhookResponse:
    """
    Interactive endpoint for frontend playground to simulate payment gateway webhook callbacks.
    """
    return WebhookService.process_gateway_webhook(db=db, payload=payload)
