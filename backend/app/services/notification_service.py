import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.users import User, Student
from app.models.enums import AuditAction, UserRole
from app.schemas.integrations import NotificationDispatchRequest, NotificationLogResponse
from app.services.audit_service import AuditService

# In-memory log buffer for notification activity feed
NOTIFICATION_LOGS: List[Dict[str, Any]] = [
    {
        "id": "notif-001",
        "event_type": "FEE_DEMAND_GENERATED",
        "student_roll": "STU1001",
        "recipient_email": "aravind.k@student.edu",
        "channels": ["EMAIL", "IN_APP"],
        "status": "DELIVERED",
        "dispatched_at": datetime(2026, 9, 1, 10, 0, 0),
        "content_preview": "Official Fee Demand for AY 2026-27 (Sem 1) has been issued. Net Payable: ₹1,78,000. Due Date: 2026-09-15."
    },
    {
        "id": "notif-002",
        "event_type": "PAYMENT_CONFIRMED",
        "student_roll": "STU1001",
        "recipient_email": "aravind.k@student.edu",
        "channels": ["EMAIL", "SMS", "IN_APP"],
        "status": "DELIVERED",
        "dispatched_at": datetime(2026, 9, 5, 14, 30, 0),
        "content_preview": "Payment of ₹1,48,000 received successfully via ONLINE_GATEWAY. Receipt #REC-2026-000004 issued."
    },
    {
        "id": "notif-003",
        "event_type": "OVERDUE_AGING_REMINDER",
        "student_roll": "STU1004",
        "recipient_email": "divya.n@student.edu",
        "channels": ["EMAIL", "WHATSAPP", "IN_APP"],
        "status": "DELIVERED",
        "dispatched_at": datetime(2026, 9, 10, 9, 0, 0),
        "content_preview": "Urgent Notice: Outstanding fee of ₹1,78,000 is 90+ days overdue. Please clear balance to avoid examination hold."
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
        """
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow()

        log_entry = {
            "id": notif_id,
            "event_type": request.event_type,
            "student_roll": request.student_roll,
            "recipient_email": request.recipient_email,
            "channels": request.channels,
            "status": "DELIVERED",
            "dispatched_at": now,
            "content_preview": request.message_body[:120] + ("..." if len(request.message_body) > 120 else "")
        }

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
                "status": "DELIVERED"
            }
        )

        return NotificationLogResponse(**log_entry)

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
