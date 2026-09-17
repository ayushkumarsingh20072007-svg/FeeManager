from typing import Dict, Any, Callable, Set, Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.users import User
from app.models.enums import UserRole
import app.ai.tools as tools

ALL_ROLES = {
    UserRole.STUDENT,
    UserRole.PARENT,
    UserRole.ACCOUNTS_OFFICER,
    UserRole.ADMIN,
    UserRole.MANAGEMENT,
    UserRole.FINANCE_APPROVER,
    UserRole.SYSTEM_ADMIN,
}

STAFF_ROLES = {
    UserRole.ACCOUNTS_OFFICER,
    UserRole.ADMIN,
    UserRole.MANAGEMENT,
    UserRole.FINANCE_APPROVER,
    UserRole.SYSTEM_ADMIN,
}

class ToolDefinition:
    def __init__(
        self,
        name: str,
        description: str,
        func: Callable,
        allowed_roles: Set[UserRole],
        required_params: List[str] = None
    ):
        self.name = name
        self.description = description
        self.func = func
        self.allowed_roles = allowed_roles
        self.required_params = required_params or []

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        self.register(
            ToolDefinition(
                name="get_student_fee_summary",
                description="Fetches full student fee summary including gross demand, reductions, net demand, paid, and balance.",
                func=tools.get_student_fee_summary,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_outstanding_amount",
                description="Fetches exact outstanding balance and overdue status for a student.",
                func=tools.get_outstanding_amount,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_fee_breakdown",
                description="Fetches itemized head-wise breakdown (Tuition, Hostel, Transport, etc.) and paid vs outstanding per head.",
                func=tools.get_fee_breakdown,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_payment_history",
                description="Fetches past payment records, receipts, payment modes, and reconciliation statuses.",
                func=tools.get_payment_history,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_receipt_summary",
                description="Fetches details and allocation of a specific receipt or the latest payment receipt.",
                func=tools.get_receipt_summary,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_payment_allocation",
                description="Fetches head-wise priority allocation of a payment.",
                func=tools.get_payment_allocation,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_demand_status",
                description="Fetches fee demand details, terms, installments, and due dates.",
                func=tools.get_demand_status,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_overdue_students",
                description="Lists all students with overdue outstanding fee balances across the institution.",
                func=tools.get_overdue_students,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_reconciliation_status",
                description="Fetches bank reconciliation health, matched vs unmatched counts, and variances.",
                func=tools.get_reconciliation_status,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_unmatched_transactions",
                description="Lists bank feed transactions that have not yet been matched to internal fee receipts.",
                func=tools.get_unmatched_transactions,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_mismatch_explanations",
                description="Provides explanations for accounting variances and reconciliation exceptions.",
                func=tools.get_mismatch_explanations,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_financial_summary",
                description="Fetches high-level collections, gross demand, and outstanding summary (institutional or individual).",
                func=tools.get_financial_summary,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_collection_by_program",
                description="Fetches aggregated collection rates and receivables broken down by academic program.",
                func=tools.get_collection_by_program,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_cashflow_forecast",
                description="Computes probabilistic institutional cashflow collections forecast across 30, 60, or 90 days.",
                func=tools.get_cashflow_forecast,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="calculate_refund",
                description="Computes statutory UGC-compliant course withdrawal refund calculation.",
                func=tools.calculate_refund,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="explain_reconciliation_mismatch",
                description="Explains root cause and resolution action for a bank reconciliation mismatch code.",
                func=tools.explain_reconciliation_mismatch,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="check_exam_clearance",
                description="Detailed examination clearance evaluation for a student with holds and approvals.",
                func=tools.check_exam_clearance,
                allowed_roles=ALL_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_student_profile",
                description="Fetches academic, admission quota, CGPA, and attendance profile for a student.",
                func=tools.get_student_profile,
                allowed_roles=ALL_ROLES
            )
        )
        # Granular Cohort & Chaining Filters (Staff Only)
        self.register(
            ToolDefinition(
                name="filter_students",
                description="Multi-attribute academic filter (program, category, quota, semester, CGPA, attendance).",
                func=tools.filter_students,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_program",
                description="Filters students by degree program code (e.g. BTECH-CSE, BTECH-ECE, MBA).",
                func=tools.filter_by_program,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_category",
                description="Filters students by reservation category (e.g. OBC, SC, ST, GEN, EWS).",
                func=tools.filter_by_category,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_admission_route",
                description="Filters students by quota admission route (e.g. JEE_MAINS, VSAT).",
                func=tools.filter_by_admission_route,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_attendance_shortage",
                description="Filters students with attendance shortage below specified threshold.",
                func=tools.filter_by_attendance_shortage,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_cgpa_range",
                description="Filters students within a CGPA range.",
                func=tools.filter_by_cgpa_range,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_payment_status",
                description="Filters students by payment status (PENDING, PARTIALLY_PAID, OVERDUE, PAID).",
                func=tools.filter_by_payment_status,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_aging_bucket",
                description="Filters students by delinquency aging bucket (CURRENT, BUCKET_1, BUCKET_2, BUCKET_3, BUCKET_4).",
                func=tools.filter_by_aging_bucket,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_outstanding_range",
                description="Filters students by outstanding fee balance range.",
                func=tools.filter_by_outstanding_range,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_scholarship_recipient",
                description="Filters students who received merit or welfare scholarships.",
                func=tools.filter_by_scholarship_recipient,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_concession",
                description="Filters students who received institutional fee concessions.",
                func=tools.filter_by_concession,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_waiver",
                description="Filters students with approved fee waivers.",
                func=tools.filter_by_waiver,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_installment_plan",
                description="Filters students actively enrolled in split installment plans.",
                func=tools.filter_by_installment_plan,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="filter_by_exam_clearance",
                description="Filters students by hall ticket exam clearance status (CLEARED, BLOCKED, CONDITIONAL_HOLD).",
                func=tools.filter_by_exam_clearance,
                allowed_roles=STAFF_ROLES
            )
        )
        self.register(
            ToolDefinition(
                name="get_default_risk_score",
                description="Calculates a transparent 0-100 default risk score and factor breakdown for a student.",
                func=tools.get_default_risk_score,
                allowed_roles=STAFF_ROLES,
                required_params=["student_id"]
            )
        )
        self.register(
            ToolDefinition(
                name="get_high_risk_students",
                description="Returns cohort list of high default-risk students (score >= min_score, default 61) sorted descending.",
                func=tools.get_high_risk_students,
                allowed_roles=STAFF_ROLES
            )
        )

    def register(self, tool_def: ToolDefinition):
        self._tools[tool_def.name] = tool_def

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def execute_tool(
        self,
        tool_name: str,
        db: Session,
        current_user: User,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Executes a registered tool with strict RBAC checking.
        """
        tool = self.get_tool(tool_name)
        if not tool:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Financial tool '{tool_name}' is not recognized."
            )

        if current_user.role not in tool.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized to execute tool '{tool_name}'."
            )

        # Execute
        return tool.func(db=db, current_user=current_user, **kwargs)

# Singleton tool registry
tool_registry = ToolRegistry()
