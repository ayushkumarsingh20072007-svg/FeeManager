from app.ai.tools.student_fee_tools import (
    get_student_fee_summary,
    get_outstanding_amount,
    get_fee_breakdown,
)
from app.ai.tools.payment_tools import (
    get_payment_history,
    get_receipt_summary,
    get_payment_allocation,
)
from app.ai.tools.demand_tools import (
    get_demand_status,
)
from app.ai.tools.reconciliation_tools import (
    get_reconciliation_status,
    get_unmatched_transactions,
    get_mismatch_explanations,
)
from app.ai.tools.reporting_tools import (
    get_overdue_students,
    get_financial_summary,
    get_collection_by_program,
    get_cashflow_forecast,
    calculate_refund,
    explain_reconciliation_mismatch,
)
from app.ai.tools.filter_tools import (
    filter_students,
    filter_by_program,
    filter_by_category,
    filter_by_admission_route,
    filter_by_attendance_shortage,
    filter_by_cgpa_range,
    get_student_profile,
    filter_by_payment_status,
    filter_by_aging_bucket,
    filter_by_outstanding_range,
    filter_by_scholarship_recipient,
    filter_by_concession,
    filter_by_waiver,
    filter_by_installment_plan,
    filter_by_exam_clearance,
    check_exam_clearance,
)

from app.ai.tools.risk_tools import (
    get_default_risk_score,
    get_high_risk_students,
)

__all__ = [
    # Single-entity student & demand tools
    "get_student_fee_summary",
    "get_outstanding_amount",
    "get_fee_breakdown",
    "get_payment_history",
    "get_receipt_summary",
    "get_payment_allocation",
    "get_demand_status",
    # Reconciliation & reporting
    "get_reconciliation_status",
    "get_unmatched_transactions",
    "get_mismatch_explanations",
    "explain_reconciliation_mismatch",
    "get_overdue_students",
    "get_financial_summary",
    "get_collection_by_program",
    "get_cashflow_forecast",
    "calculate_refund",
    # Default Risk Tools
    "get_default_risk_score",
    "get_high_risk_students",
    # Multi-domain filter & chain tools
    "filter_students",
    "filter_by_program",
    "filter_by_category",
    "filter_by_admission_route",
    "filter_by_attendance_shortage",
    "filter_by_cgpa_range",
    "get_student_profile",
    "filter_by_payment_status",
    "filter_by_aging_bucket",
    "filter_by_outstanding_range",
    "filter_by_scholarship_recipient",
    "filter_by_concession",
    "filter_by_waiver",
    "filter_by_installment_plan",
    "filter_by_exam_clearance",
    "check_exam_clearance",
]

