import os
import json
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from app.core.config import settings
from app.ai.prompts import SYSTEM_PROMPT, format_tool_explanation_prompt

def format_currency(val: Any) -> str:
    try:
        num = float(val)
        return f"₹{num:,.2f}".replace(".00", "")
    except Exception:
        return f"₹{val}"

class AIProvider(ABC):
    @abstractmethod
    def generate_response(
        self,
        user_query: str,
        tool_name: str,
        tool_data: Dict[str, Any],
        user_role: str
    ) -> str:
        """Generates a natural language explanation from tool output."""
        pass

class DeterministicFallbackProvider(AIProvider):
    """
    Deterministic, zero-hallucination explanation engine that formats tool outputs
    into clear, professional natural language without needing an external API key.
    """
    def generate_response(
        self,
        user_query: str,
        tool_name: str,
        tool_data: Dict[str, Any],
        user_role: str
    ) -> str:
        if tool_name == "get_outstanding_amount":
            out = tool_data.get("outstanding_amount", 0)
            net = tool_data.get("net_demand", 0)
            paid = tool_data.get("paid_amount", 0)
            status_text = tool_data.get("status", "ACTIVE")
            is_overdue = tool_data.get("is_overdue", False)
            student_name = tool_data.get("name", "Student")
            roll_no = tool_data.get("roll_no", "")

            overdue_note = " ⚠️ **This fee is currently OVERDUE.** Please arrange payment at the earliest." if is_overdue else ""

            if out == 0:
                return (
                    f"Great news! There is **no outstanding fee** for {student_name} ({roll_no}).\n\n"
                    f"• **Net Fee Demand:** {format_currency(net)}\n"
                    f"• **Total Paid:** {format_currency(paid)}\n"
                    f"• **Outstanding Balance:** ₹0\n"
                    f"• **Status:** {status_text}"
                )
            else:
                return (
                    f"Your current outstanding fee balance is **{format_currency(out)}** for {student_name} ({roll_no}).{overdue_note}\n\n"
                    f"• **Net Fee Demand:** {format_currency(net)}\n"
                    f"• **Total Paid:** {format_currency(paid)}\n"
                    f"• **Outstanding Balance:** {format_currency(out)}\n"
                    f"• **Status:** {status_text}\n"
                    f"• **Due Date:** {tool_data.get('due_date') or 'N/A'}"
                )

        elif tool_name == "get_student_fee_summary":
            gross = tool_data.get("gross_demand", 0)
            reductions = tool_data.get("total_reductions", 0)
            net = tool_data.get("net_demand", 0)
            paid = tool_data.get("paid_amount", 0)
            out = tool_data.get("outstanding_amount", 0)
            student_name = tool_data.get("name", "Student")
            roll_no = tool_data.get("roll_no", "")
            prog = tool_data.get("program", "")
            ay = tool_data.get("academic_year", "")
            sem = tool_data.get("semester", 1)

            scholarship = tool_data.get("scholarship_amount", 0)
            concession = tool_data.get("concession_amount", 0)
            waiver = tool_data.get("waiver_amount", 0)

            red_line = ""
            if reductions > 0:
                red_line = f"• **Scholarships & Waivers:** -{format_currency(reductions)} (Scholarship: {format_currency(scholarship)}, Concession: {format_currency(concession)}, Waiver: {format_currency(waiver)})\n"

            return (
                f"### Verified Fee Summary for {student_name} ({roll_no})\n"
                f"**Program:** {prog} | **Academic Year:** {ay} (Semester {sem})\n\n"
                f"• **Gross Annual Demand:** {format_currency(gross)}\n"
                f"{red_line}"
                f"• **Net Payable Demand:** {format_currency(net)}\n"
                f"• **Total Reconciled Paid:** {format_currency(paid)}\n"
                f"• **Current Outstanding:** **{format_currency(out)}**\n"
                f"• **Account Status:** `{tool_data.get('status', 'ACTIVE')}`"
            )

        elif tool_name == "get_fee_breakdown":
            items = tool_data.get("items", [])
            lines = [f"### Head-Wise Itemized Fee Breakdown ({tool_data.get('roll_no', '')})"]
            for it in items:
                lines.append(
                    f"- **{it.get('head_name')}** (P{it.get('priority')}): Gross {format_currency(it.get('gross_amount'))} | Paid {format_currency(it.get('paid_amount'))} | Due **{format_currency(it.get('outstanding_amount'))}**"
                )
            lines.append(f"\n**Total Net Demand:** {format_currency(tool_data.get('net_demand', 0))} | **Total Paid:** {format_currency(tool_data.get('paid_amount', 0))} | **Total Outstanding:** **{format_currency(tool_data.get('outstanding_amount', 0))}**")
            return "\n".join(lines)

        elif tool_name == "get_payment_history":
            payments = tool_data.get("payments", [])
            if not payments:
                return "No payment records found for the specified account."
            
            lines = [f"Found **{len(payments)} payment transaction(s)** totaling **{format_currency(tool_data.get('total_amount', 0))}**:"]
            for p in payments[:5]:
                date_str = p.get('payment_date', '')[:10] if p.get('payment_date') else 'N/A'
                lines.append(
                    f"• **Receipt #{p.get('receipt_number')}** — {format_currency(p.get('amount'))} via `{p.get('payment_channel')}` on {date_str} (Status: `{p.get('status')}`, Recon: `{p.get('reconciliation_status')}`)"
                )
            return "\n".join(lines)

        elif tool_name == "get_receipt_summary" or tool_name == "get_payment_allocation":
            rcpt = tool_data.get("receipt_number", "N/A")
            amt = tool_data.get("amount_paid", 0)
            roll = tool_data.get("student_roll", "")
            channel = tool_data.get("payment_channel", "ONLINE")
            date_str = tool_data.get("payment_date", "")[:10] if tool_data.get("payment_date") else "N/A"
            allocations = tool_data.get("allocations", [])

            alloc_lines = []
            for a in allocations:
                alloc_lines.append(f"  - {a.get('head_name')}: {format_currency(a.get('allocated_amount'))}")

            alloc_text = "\n".join(alloc_lines) if alloc_lines else "  - Standard demand item allocation"

            return (
                f"### Receipt Details: {rcpt}\n"
                f"• **Student:** {roll} ({tool_data.get('student_name', '')})\n"
                f"• **Amount Paid:** **{format_currency(amt)}**\n"
                f"• **Date:** {date_str}\n"
                f"• **Channel:** `{channel}` (Ref: `{tool_data.get('transaction_reference', 'N/A')}`)\n"
                f"• **Priority Allocations Applied:**\n{alloc_text}"
            )

        elif tool_name == "get_overdue_students":
            count = tool_data.get("total_overdue_count", 0)
            total_amt = tool_data.get("total_overdue_amount", 0)
            students = tool_data.get("students", [])

            lines = [
                f"### Overdue Receivables Report\n"
                f"There are currently **{count} students** with overdue balances totaling **{format_currency(total_amt)}**.\n"
            ]
            for s in students[:5]:
                lines.append(
                    f"• **{s.get('name')}** (`{s.get('roll_no')}` - {s.get('program')}): Outstanding **{format_currency(s.get('outstanding_amount'))}** (Due: {s.get('due_date')})"
                )
            if len(students) > 5:
                lines.append(f"\n_Showing top 5 overdue records. View complete list on the Aging page._")
            return "\n".join(lines)

        elif tool_name == "get_reconciliation_status":
            total = tool_data.get("total_bank_transactions", 0)
            matched = tool_data.get("matched_transactions", 0)
            unmatched = tool_data.get("unmatched_transactions", 0)
            mismatches = tool_data.get("open_mismatches_count", 0)
            health = tool_data.get("reconciliation_health", "RECONCILED")

            return (
                f"### Institutional Bank Reconciliation Status\n"
                f"• **Health:** `{health}`\n"
                f"• **Total Bank Feed Transactions:** {total}\n"
                f"• **Matched & Reconciled:** {matched}\n"
                f"• **Unmatched Bank Transactions:** {unmatched}\n"
                f"• **Open Reconciliation Mismatches / Exceptions:** **{mismatches}**\n"
                f"• **Latest Batch:** `{tool_data.get('latest_batch_code', 'N/A')}` (Net Variance: {format_currency(tool_data.get('net_variance', 0))})"
            )

        elif tool_name == "get_unmatched_transactions":
            txns = tool_data.get("transactions", [])
            lines = [f"### Unmatched Bank Transactions ({len(txns)} found)"]
            for t in txns[:5]:
                lines.append(f"• **{t.get('bank_transaction_id')}**: {format_currency(t.get('amount'))} on {str(t.get('date'))[:10]} (Ref: `{t.get('reference_number')}`) — _{t.get('description')}_")
            return "\n".join(lines)

        elif tool_name == "get_mismatch_explanations":
            if "mismatches" in tool_data:
                m_list = tool_data.get("mismatches", [])
                lines = [f"### Active Reconciliation Exceptions ({len(m_list)} found)"]
                for m in m_list:
                    lines.append(
                        f"• **{m.get('code')}** (`{m.get('category')}`): Expected {format_currency(m.get('expected_amount'))} vs Actual {format_currency(m.get('actual_amount'))} (Variance: **{format_currency(m.get('variance'))}**)\n"
                        f"  _Flag: {m.get('flagged_message')}_"
                    )
                return "\n".join(lines)
            else:
                return (
                    f"### Reconciliation Exception: {tool_data.get('code')}\n"
                    f"• **Category:** `{tool_data.get('category')}`\n"
                    f"• **Expected Amount:** {format_currency(tool_data.get('expected_amount'))}\n"
                    f"• **Actual Amount in Statement:** {format_currency(tool_data.get('actual_amount'))}\n"
                    f"• **Variance:** **{format_currency(tool_data.get('variance'))}**\n"
                    f"• **Status:** `{tool_data.get('status')}`\n"
                    f"• **Audit Note:** {tool_data.get('flagged_message')}"
                )

        elif tool_name == "get_financial_summary":
            if tool_data.get("scope") == "INSTITUTIONAL_CORE":
                gross = tool_data.get("total_gross_demand", 0)
                net = tool_data.get("total_net_demand", 0)
                collected = tool_data.get("total_collected", 0)
                out = tool_data.get("total_outstanding", 0)
                rate = tool_data.get("collection_rate_percentage", 0)
                students = tool_data.get("total_students", 0)

                return (
                    f"### Institutional Financial Overview (AY 2026-27)\n"
                    f"Across **{students} active student cohorts**:\n\n"
                    f"• **Gross Fee Demand:** {format_currency(gross)}\n"
                    f"• **Net Receivable Demand:** {format_currency(net)}\n"
                    f"• **Total Collections Realized:** {format_currency(collected)} (**{rate}%** collection rate)\n"
                    f"• **Total Outstanding Receivables:** **{format_currency(out)}**\n"
                    f"• **Paid in Full:** {tool_data.get('students_paid_in_full')} | **Partially Paid:** {tool_data.get('students_partially_paid')} | **Overdue:** {tool_data.get('students_overdue')}"
                )
            else:
                return self.generate_response(user_query, "get_student_fee_summary", tool_data, user_role)

        elif tool_name == "get_collection_by_program":
            progs = tool_data.get("programs", [])
            lines = ["### Fee Collection Performance by Program"]
            for p in progs:
                lines.append(
                    f"• **{p.get('program_code')}** ({p.get('program_name')}): Net {format_currency(p.get('net_demand'))} | Collected {format_currency(p.get('collected'))} ({p.get('collection_rate')}%) | Due **{format_currency(p.get('outstanding'))}**"
                )
            return "\n".join(lines)

        elif tool_name == "multi_filter_planner":
            cnt = tool_data.get("matched_count", 0)
            sample = tool_data.get("sample", [])
            preds = tool_data.get("predicates", [])
            pred_desc = ", ".join([f"{p.get('field')}={p.get('value')}" for p in preds]) if preds else "Composite criteria"

            lines = [f"### Multi-Filter Query Results"]
            lines.append(f"Filters applied: **{pred_desc}**\n")
            if cnt == 0:
                lines.append(f"**0 students** matched this combination of criteria.")
                lines.append("No student records currently meet all specified academic, financial, and clearance constraints.")
            else:
                lines.append(f"Found **{cnt} student(s)** strictly matching all criteria:\n")
                for s in sample:
                    out_str = format_currency(s.get("outstanding", 0))
                    status_badge = s.get("status", "ACTIVE")
                    prog = s.get("program", "")
                    cat = s.get("category", "")
                    lines.append(
                        f"• **{s.get('roll_no')}** — {s.get('name')} ({prog} | {cat}) — Balance: **{out_str}** | Status: `{status_badge}`"
                    )
                if cnt > len(sample):
                    lines.append(f"\n_Showing top {len(sample)} of {cnt} total matched records._")
            return "\n".join(lines)

        elif tool_name.startswith("filter_"):
            cnt = tool_data.get("count", 0)
            sample = tool_data.get("sample", [])
            lines = [f"### Filter Results ({cnt} matched)"]
            for s in sample[:5]:
                lines.append(f"• **{s.get('roll_no')}** — {s.get('name')} | Balance: {format_currency(s.get('outstanding', 0))} | Status: `{s.get('status')}`")
            if cnt > 5:
                lines.append(f"_...and {cnt - 5} more records._")
            return "\n".join(lines)

        return f"Authoritative financial data processed successfully:\n```json\n{json.dumps(tool_data, indent=2)}\n```"

class GeminiProvider(AIProvider):
    """
    LLM provider using Google GenAI SDK when GEMINI_API_KEY is configured.
    Falls back gracefully to DeterministicFallbackProvider if unavailable.
    """
    def __init__(self, fallback: DeterministicFallbackProvider):
        self.fallback = fallback
        self.api_key = getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY")

    def generate_response(
        self,
        user_query: str,
        tool_name: str,
        tool_data: Dict[str, Any],
        user_role: str
    ) -> str:
        if not self.api_key:
            return self.fallback.generate_response(user_query, tool_name, tool_data, user_role)

        try:
            # Attempt to use google-genai or fallback
            from google import genai
            client = genai.Client(api_key=self.api_key)
            prompt = format_tool_explanation_prompt(user_query, tool_name, tool_data, user_role)
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"system_instruction": SYSTEM_PROMPT}
            )
            if response and response.text:
                return response.text.strip()
            return self.fallback.generate_response(user_query, tool_name, tool_data, user_role)
        except Exception:
            return self.fallback.generate_response(user_query, tool_name, tool_data, user_role)

def get_ai_provider() -> AIProvider:
    fallback = DeterministicFallbackProvider()
    api_key = getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY")
    if api_key:
        return GeminiProvider(fallback)
    return fallback
