import re
from typing import Dict, Any, Tuple, Optional, List
from app.models.users import User
from app.models.enums import UserRole

# Regular expressions to extract standard institutional entity codes
ROLL_NO_REGEX = r"\b(STU\d{4}|\d{2}[A-Z]{2,3}\d{4,6}|[A-Za-z0-9_-]{5,15})\b"
RECEIPT_REGEX = r"\b(REC[-_]\d{4}[-_]\d{4,8})\b"
MISMATCH_REGEX = r"\b(MIS[-_]\d{4}[-_]\d{3,6})\b"

class IntentRouter:
    @staticmethod
    def extract_entities(query: str) -> Dict[str, Any]:
        """Extracts student roll numbers, receipt IDs, or mismatch codes from natural text."""
        entities: Dict[str, Any] = {}
        
        # Match student roll no like STU1001 or 231FA04001
        roll_match = re.search(r"\b(STU\d{4})\b", query, re.IGNORECASE)
        if roll_match:
            entities["roll_no"] = roll_match.group(1).upper()
        else:
            roll_match2 = re.search(r"\b(231FA\d{5})\b", query, re.IGNORECASE)
            if roll_match2:
                entities["roll_no"] = roll_match2.group(1).upper()

        # Match receipt number
        rcpt_match = re.search(RECEIPT_REGEX, query, re.IGNORECASE)
        if rcpt_match:
            entities["receipt_number"] = rcpt_match.group(1).upper()

        # Match mismatch code
        mis_match = re.search(MISMATCH_REGEX, query, re.IGNORECASE)
        if mis_match:
            entities["mismatch_code"] = mis_match.group(1).upper()

        return entities

    @classmethod
    def route_intent(cls, query: str, current_user: User) -> Tuple[str, str, Dict[str, Any], List[str]]:
        """
        Classifies intent and maps to appropriate tool name and parameters.
        Returns: (intent_name, tool_name, parameters, suggested_prompts)
        """
        q = query.lower().strip()
        entities = cls.extract_entities(query)
        role = current_user.role

        # Check if student/parent vs staff
        is_staff = role in (
            UserRole.ACCOUNTS_OFFICER,
            UserRole.ADMIN,
            UserRole.MANAGEMENT,
            UserRole.FINANCE_APPROVER,
            UserRole.SYSTEM_ADMIN,
        )

        # 1. Overdue students (Staff only tool)
        if any(kw in q for kw in ["overdue", "defaulter", "pending balance students", "students with outstanding"]):
            return (
                "GET_OVERDUE_STUDENTS",
                "get_overdue_students",
                {},
                ["Show fee collection by program", "Give me a financial summary", "Show payment reconciliation exceptions"]
            )

        # 2. Reconciliation Status & Unmatched Bank transactions (Staff only tools)
        if "unmatched" in q or "bank feed" in q or "unreconciled bank" in q:
            return (
                "GET_UNMATCHED_TRANSACTIONS",
                "get_unmatched_transactions",
                {},
                ["Show reconciliation status", "Explain this reconciliation mismatch", "Give me a financial summary"]
            )

        if "reconciliation" in q or "recon" in q or "variance" in q or "mismatch" in q:
            if "mismatch" in q or "exception" in q or "explain" in q:
                params = {}
                if "mismatch_code" in entities:
                    params["mismatch_code"] = entities["mismatch_code"]
                return (
                    "EXPLAIN_MISMATCH",
                    "get_mismatch_explanations",
                    params,
                    ["Show reconciliation status", "Show unmatched bank transactions", "Show overdue students"]
                )
            return (
                "GET_RECONCILIATION_STATUS",
                "get_reconciliation_status",
                {},
                ["Show unmatched bank transactions", "Explain this reconciliation mismatch", "Show fee collection by program"]
            )

        # 3. Collection by program (Staff only tool)
        if "by program" in q or "program wise" in q or "collection by branch" in q:
            return (
                "GET_COLLECTION_BY_PROGRAM",
                "get_collection_by_program",
                {},
                ["Give me a financial summary", "Show overdue students", "Show payment reconciliation exceptions"]
            )

        # 4. Institutional Financial Summary
        if is_staff and any(kw in q for kw in ["collection summary", "financial summary", "today's collection", "overall collection", "dashboard summary"]):
            return (
                "GET_FINANCIAL_SUMMARY",
                "get_financial_summary",
                {},
                ["Show overdue students", "Show fee collection by program", "Show payment reconciliation exceptions"]
            )

        # 5. Fee Breakdown / Breakup (Student, Parent, or Staff for specific student)
        if any(kw in q for kw in ["breakup", "breakdown", "heads", "head-wise", "itemized", "components"]):
            params = {}
            if "roll_no" in entities and is_staff:
                params["roll_no"] = entities["roll_no"]
            return (
                "GET_FEE_BREAKDOWN",
                "get_fee_breakdown",
                params,
                ["What is my outstanding fee?", "Show my payment history", "What is my current demand?"]
            )

        # 6. Outstanding fee / balance due / how much to pay
        if any(kw in q for kw in ["outstanding", "due", "balance", "how much do i owe", "how much still", "to pay", "pending fee"]):
            params = {}
            if "roll_no" in entities and is_staff:
                params["roll_no"] = entities["roll_no"]
            return (
                "GET_OUTSTANDING_AMOUNT",
                "get_outstanding_amount",
                params,
                ["Show my fee breakup", "Show my payment history", "Show my receipt details"]
            )

        # 7. Payment history / How much have I paid
        if any(kw in q for kw in ["paid", "payment history", "transactions", "past payment", "my payments"]):
            params = {}
            if "roll_no" in entities and is_staff:
                params["roll_no"] = entities["roll_no"]
            return (
                "GET_PAYMENT_HISTORY",
                "get_payment_history",
                params,
                ["What is my outstanding fee?", "Show my receipt details", "Show my fee breakup"]
            )

        # 8. Receipt / Allocation details
        if any(kw in q for kw in ["receipt", "allocation", "acknowledgement", "challan"]):
            params = {}
            if "receipt_number" in entities:
                params["receipt_number"] = entities["receipt_number"]
            if "roll_no" in entities and is_staff:
                params["roll_no"] = entities["roll_no"]
            return (
                "GET_RECEIPT_SUMMARY",
                "get_receipt_summary",
                params,
                ["Show my payment history", "What is my outstanding fee?", "Show my fee breakup"]
            )

        # 9. Demand status / installment plan
        if any(kw in q for kw in ["demand", "installment", "due date", "when is the fee due"]):
            params = {}
            if "roll_no" in entities and is_staff:
                params["roll_no"] = entities["roll_no"]
            return (
                "GET_DEMAND_STATUS",
                "get_demand_status",
                params,
                ["What is my outstanding fee?", "Show my fee breakup", "Show my payment history"]
            )

        # 10. Default general student fee summary or institutional summary
        if is_staff and not entities.get("roll_no"):
            return (
                "GET_FINANCIAL_SUMMARY",
                "get_financial_summary",
                {},
                ["Show overdue students", "Show fee collection by program", "Show payment reconciliation exceptions"]
            )
        else:
            params = {}
            if "roll_no" in entities and is_staff:
                params["roll_no"] = entities["roll_no"]
            return (
                "GET_STUDENT_FEE_SUMMARY",
                "get_student_fee_summary",
                params,
                ["What is my outstanding fee?", "Show my fee breakup", "Show my payment history"]
            )
