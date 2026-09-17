import re
from typing import Dict, Any, Optional, Tuple
from fastapi import HTTPException, status
from app.models.users import User
from app.models.enums import UserRole

# Keywords that suggest a user is asking the AI to perform unauthorized write operations
DISALLOWED_WRITE_PATTERNS = [
    (r"\b(approve|reject|authorize)\s+(refund|waiver|concession|adjustment)\b", "Financial write actions (approvals/rejections) require human sign-off via the official Approvals portal."),
    (r"\b(reverse|cancel)\s+(payment|transaction|receipt)\b", "Payment reversals must be executed through the authorized Payments & Allocation screen by an Accounts Officer."),
    (r"\b(delete|drop|truncate|alter|insert|update)\s+(table|database|user|student|payment|fee)\b", "Direct database operations are strictly prohibited by security guardrails."),
    (r"\b(modify|change|waive)\s+(my\s+fee|demand|amount)\b", "Fee modifications or waivers require a formal proposal and Finance Approver authorization."),
    (r"\b(create|generate|issue)\s+(refund|waiver)\b", "Refund proposals must be submitted through the Refunds lifecycle module."),
]

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"system\s+prompt",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"bypass\s+(rbac|security|guardrails|filters)",
    r"act\s+as\s+admin",
]

class Guardrails:
    @staticmethod
    def inspect_query(query: str, current_user: User) -> Tuple[bool, Optional[str]]:
        """
        Validates the natural language query against financial safety rules.
        Returns (is_safe, error_or_guidance_message).
        """
        q_lower = query.lower().strip()

        # Check prompt injection
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, q_lower):
                return False, "Security Notice: Your query contains disallowed system override instructions. Please ask standard fee and finance questions."

        # Check write action attempts
        for pattern, explanation in DISALLOWED_WRITE_PATTERNS:
            if re.search(pattern, q_lower):
                return False, f"Notice: The AI Assistant is strictly read-only and cannot execute financial mutations. {explanation}"

        return True, None

    @staticmethod
    def sanitize_parameters(
        params: Dict[str, Any],
        current_user: User
    ) -> Dict[str, Any]:
        """
        Enforces strict parameter sanitization:
        - Students and Parents cannot supply arbitrary student_id or roll_no to access unauthorized accounts.
        """
        sanitized = dict(params)

        if current_user.role == UserRole.STUDENT:
            # Force student_id and roll_no to current user's profile
            if current_user.student_profile:
                sanitized["student_id"] = current_user.student_profile.id
                sanitized["roll_no"] = current_user.student_profile.roll_no
            else:
                sanitized.pop("student_id", None)
                sanitized.pop("roll_no", None)

        elif current_user.role == UserRole.PARENT:
            # Check if ward is specified and authorized
            wards = current_user.parent_profile.wards if current_user.parent_profile else []
            ward_ids = [w.id for w in wards]
            ward_rolls = [w.roll_no.upper() for w in wards]

            if "student_id" in sanitized and sanitized["student_id"] not in ward_ids:
                sanitized.pop("student_id", None)
            if "roll_no" in sanitized and sanitized["roll_no"].upper() not in ward_rolls:
                sanitized.pop("roll_no", None)

        return sanitized

    @staticmethod
    def validate_tool_access(tool_name: str, current_user: User):
        """Checks RBAC authorization for a specific tool."""
        from app.ai.tool_registry import tool_registry
        tool = tool_registry.get_tool(tool_name)
        if not tool:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Financial tool '{tool_name}' not found."
            )
        if current_user.role not in tool.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Role '{current_user.role}' is not authorized to query '{tool_name}'."
            )
