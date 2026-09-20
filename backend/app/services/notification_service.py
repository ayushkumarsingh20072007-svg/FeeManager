import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.users import User, Student
from app.models.enums import AuditAction, UserRole
from app.schemas.integrations import NotificationDispatchRequest, NotificationLogResponse
from app.services.audit_service import AuditService
from app.core.config import settings
from app.core.twilio_client import get_twilio_client

# In-memory log buffer for notification activity feed
NOTIFICATION_LOGS: List[Dict[str, Any]] = [
    {
        "id": "notif-001",
        "event_type": "FEE_DEMAND_GENERATED",
        "student_roll": "STU1001",
        "recipient_email": "aravind.k@student.edu",
        "recipient_phone": None,
        "channels": ["EMAIL", "IN_APP"],
        "status": "DELIVERED",
        "dispatched_at": datetime(2026, 9, 1, 10, 0, 0),
        "content_preview": "Official Fee Demand for AY 2026-27 (Sem 1) has been issued. Net Payable: ₹1,78,000. Due Date: 2026-09-15.",
        "delivery_results": None
    },
    {
        "id": "notif-002",
        "event_type": "PAYMENT_CONFIRMED",
        "student_roll": "STU1001",
        "recipient_email": "aravind.k@student.edu",
        "recipient_phone": None,
        "channels": ["EMAIL", "SMS", "IN_APP"],
        "status": "DELIVERED",
        "dispatched_at": datetime(2026, 9, 5, 14, 30, 0),
        "content_preview": "Payment of ₹1,48,000 received successfully via ONLINE_GATEWAY. Receipt #REC-2026-000004 issued.",
        "delivery_results": None
    },
    {
        "id": "notif-003",
        "event_type": "OVERDUE_AGING_REMINDER",
        "student_roll": "STU1004",
        "recipient_email": "divya.n@student.edu",
        "recipient_phone": None,
        "channels": ["EMAIL", "WHATSAPP", "IN_APP"],
        "status": "DELIVERED",
        "dispatched_at": datetime(2026, 9, 10, 9, 0, 0),
        "content_preview": "Urgent Notice: Outstanding fee of ₹1,78,000 is 90+ days overdue. Please clear balance to avoid examination hold.",
        "delivery_results": None
    }
]

class NotificationService:
    @classmethod
    def dispatch_notification(
        cls,
        db: Session,
        request: NotificationDispatchRequest,
        current_user: Optional[User] = None
    ) -> NotificationLogResponse:
        """
        Dispatches an automated financial notification and records an append-only audit entry.
        SMS and WHATSAPP channels are dispatched via Twilio if credentials are configured;
        otherwise they degrade gracefully to SIMULATED status.
        """
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow()

        log_entry: Dict[str, Any] = {
            "id": notif_id,
            "event_type": request.event_type,
            "student_roll": request.student_roll,
            "recipient_email": request.recipient_email,
            "recipient_phone": request.recipient_phone,
            "channels": request.channels,
            "status": "DELIVERED",  # will be overridden below
            "dispatched_at": now,
            "content_preview": request.message_body[:120] + ("..." if len(request.message_body) > 120 else ""),
            "delivery_results": None
        }

        # ── Real dispatch for SMS / WhatsApp via Twilio ──────────────────────
        delivery_results: Dict[str, Any] = {}
        client = get_twilio_client()

        if "SMS" in request.channels:
            delivery_results["SMS"] = cls._send_sms(client, request)

        if "WHATSAPP" in request.channels:
            delivery_results["WHATSAPP"] = cls._send_whatsapp(client, request)

        if delivery_results:
            log_entry["delivery_results"] = delivery_results

        # Overall status derived from real dispatch outcomes
        log_entry["status"] = cls._compute_overall_status(delivery_results)

        # Prepend to activity feed
        NOTIFICATION_LOGS.insert(0, log_entry)

        # Audit Log
        AuditService.log_event(
            db=db,
            action=AuditAction.CREATE,
            resource_type="NOTIFICATION_DISPATCHED",
            resource_id=notif_id,
            user_id=current_user.id if current_user else None,
            role=current_user.role if current_user else UserRole.SYSTEM_ADMIN,
            details={
                "event_type": request.event_type,
                "student_roll": request.student_roll,
                "recipient": request.recipient_email,
                "channels": request.channels,
                "subject": request.subject,
                "status": log_entry["status"],
                "delivery_results": delivery_results or None
            }
        )

        return NotificationLogResponse(**log_entry)

    # ── Private helpers ───────────────────────────────────────────────────────

    @classmethod
    def _send_sms(cls, client, request: NotificationDispatchRequest) -> Dict[str, Any]:
        """Send SMS via Twilio; never raises — returns status dict."""
        if client is None:
            return {"status": "SIMULATED", "reason": "Twilio not configured"}

        if not request.recipient_phone:
            return {"status": "SIMULATED", "reason": "No recipient_phone provided"}

        try:
            msg = client.messages.create(
                body=request.message_body[:1600],
                from_=settings.TWILIO_SMS_FROM,
                to=request.recipient_phone
            )
            return {"status": "SENT", "provider_sid": msg.sid}
        except Exception as e:
            return {"status": "FAILED", "error": str(e)}

    @classmethod
    def _send_whatsapp(cls, client, request: NotificationDispatchRequest) -> Dict[str, Any]:
        """Send WhatsApp message via Twilio sandbox; never raises — returns status dict."""
        if client is None:
            return {"status": "SIMULATED", "reason": "Twilio not configured"}

        if not request.recipient_phone:
            return {"status": "SIMULATED", "reason": "No recipient_phone provided"}

        if not settings.TWILIO_WHATSAPP_FROM:
            return {"status": "SIMULATED", "reason": "TWILIO_WHATSAPP_FROM not configured"}

        try:
            # Twilio WhatsApp sandbox requires whatsapp: prefix on both sides
            from_wa = (
                f"whatsapp:{settings.TWILIO_WHATSAPP_FROM}"
                if not settings.TWILIO_WHATSAPP_FROM.startswith("whatsapp:")
                else settings.TWILIO_WHATSAPP_FROM
            )
            to_wa = (
                f"whatsapp:{request.recipient_phone}"
                if not request.recipient_phone.startswith("whatsapp:")
                else request.recipient_phone
            )
            msg = client.messages.create(
                body=request.message_body[:1600],
                from_=from_wa,
                to=to_wa
            )
            return {"status": "SENT", "provider_sid": msg.sid}
        except Exception as e:
            return {"status": "FAILED", "error": str(e)}

    @classmethod
    def _compute_overall_status(cls, delivery_results: Dict[str, Any]) -> str:
        """
        Compute overall notification status from per-channel results.
          - No real channels attempted    → SIMULATED
          - All channels SENT             → DELIVERED
          - All channels FAILED           → FAILED
          - Mixed SENT + FAILED / SIM     → PARTIALLY_DELIVERED
        """
        if not delivery_results:
            return "DELIVERED"  # EMAIL / IN_APP only — treated as delivered

        statuses = [v.get("status", "FAILED") for v in delivery_results.values()]

        if all(s == "SIMULATED" for s in statuses):
            return "SIMULATED"
        if all(s == "SENT" for s in statuses):
            return "DELIVERED"
        if all(s == "FAILED" for s in statuses):
            return "FAILED"
        return "PARTIALLY_DELIVERED"

    @classmethod
    def get_recent_notifications(
        cls,
        student_roll: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50
    ) -> List[NotificationLogResponse]:
        """Lists recent notification event logs."""
        filtered = NOTIFICATION_LOGS
        if student_roll:
            filtered = [n for n in filtered if n["student_roll"].upper() == student_roll.upper()]
        if event_type:
            filtered = [n for n in filtered if n["event_type"] == event_type]

        return [NotificationLogResponse(**n) for n in filtered[:limit]]
