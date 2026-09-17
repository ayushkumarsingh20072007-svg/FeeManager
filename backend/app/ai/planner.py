"""
Query Planner and DAG Executor for Agent 40.
Implements multi-step, multi-filter reasoning:
1. Decomposes compound natural language queries into filter predicates.
2. Maps predicates to canonical financial and academic tools.
3. Builds an execution DAG (capped at max depth 5).
4. Enforces all-or-nothing RBAC authorization on all tools in the DAG.
5. Executes tools in dependency order, performing deterministic Python set-intersections.
6. Returns an explainable reasoning trace and structured data.
"""
import re
from typing import List, Dict, Any, Optional, Tuple, Set
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.users import User
from app.models.enums import UserRole, AuditAction
from app.services.audit_service import AuditService
from app.ai.tool_registry import tool_registry

MAX_DAG_DEPTH = 5

SUPPORTED_FIELDS = {
    "program", "category", "admission_route", "semester", "cgpa", "attendance",
    "payment_status", "status", "aging_bucket", "outstanding", "scholarship",
    "concession", "waiver", "installment", "exam_clearance", "clearance"
}

KNOWN_UNSUPPORTED_DOMAINS = [
    ("blood group", "medical/blood group data"),
    ("hostel room", "hostel room allotment details"),
    ("bus route", "transportation route allocation"),
    ("placement", "campus placement package data"),
    ("library book", "physical library book issue tracking"),
    ("sports medal", "sports achievements and medals"),
]

class QueryPredicate(BaseModel):
    domain: str = Field(..., description="academic, financial, or exam")
    field: str = Field(..., description="Target attribute e.g. category, program, status")
    value: Any = Field(..., description="Predicate value e.g. OBC, CSE, OVERDUE, BLOCKED")
    operator: str = Field("eq", description="eq, gte, lte, in")

class DAGStep(BaseModel):
    step_number: int
    tool_name: str
    params: Dict[str, Any] = Field(default_factory=dict)
    description: str
    depends_on: Optional[int] = None

class ExecutionDAG(BaseModel):
    is_compound: bool = False
    predicates: List[QueryPredicate] = Field(default_factory=list)
    steps: List[DAGStep] = Field(default_factory=list)
    unmappable_predicates: List[str] = Field(default_factory=list)

class QueryPlanner:
    MAX_DEPTH = MAX_DAG_DEPTH

    @classmethod
    def is_compound_query(cls, query: str) -> bool:
        """
        Determines whether a natural language query contains 2 or more filter conditions
        spanning academic, financial, or gate domains, or contains unsupported attributes.
        """
        q = query.lower()
        # Look for conjunctions or multi-criteria phrasing
        has_conjunction = any(w in q for w in [" and ", " & ", " with ", " who are ", " having ", " also "])
        
        # Check predicate triggers
        has_program = any(p in q for p in ["cse", "ece", "mba", "mca", "btech", "b.tech", "mech", "civil", "biotech", "eee", "it"])
        has_category = bool(re.search(r"\b(obc|sc|st|gen|general|ews)\b", q))
        has_status = any(s in q for s in ["overdue", "defaulter", "pending", "partially paid", "unpaid", "paid"])
        has_clearance = any(g in q for g in ["exam clearance", "clearance", "hall ticket", "blocked", "admit card"])
        has_aging = any(a in q for a in ["bucket", "days overdue", "overdue by", "aging"])
        has_attendance = any(att in q for att in ["attendance", "shortage", "condonation"])
        has_unsupported = any(keyword in q for keyword, _ in KNOWN_UNSUPPORTED_DOMAINS)

        predicate_count = sum([has_program, has_category, has_status, has_clearance, has_aging, has_attendance])
        return predicate_count >= 2 or (has_conjunction and predicate_count >= 1) or has_unsupported

    @classmethod
    def extract_predicates(cls, query: str) -> Tuple[List[QueryPredicate], List[str]]:
        """
        Extracts structured filter predicates and identifies unmappable attributes from query text.
        """
        q = query.lower()
        predicates: List[QueryPredicate] = []
        unmappable: List[str] = []

        # Check for known unsupported domains
        for keyword, label in KNOWN_UNSUPPORTED_DOMAINS:
            if keyword in q:
                unmappable.append(label)

        # 1. Program predicate
        if "cse" in q or "btech-cse" in q or "computer science" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="CSE"))
        elif "ece" in q or "btech-ece" in q or "electronics" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="ECE"))
        elif "mech" in q or "mechanical" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="MECH"))
        elif "civil" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="CIVIL"))
        elif "biotech" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="BIOTECH"))
        elif "eee" in q or "electrical" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="EEE"))
        elif "mba" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="MBA"))
        elif "mca" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="MCA"))
        elif "btech" in q or "b.tech" in q:
            predicates.append(QueryPredicate(domain="academic", field="program", value="BTECH"))

        # 2. Category predicate (use regex boundaries to avoid false positives)
        for cat_label, cat_val in [("OBC", "OBC"), ("SC", "SC"), ("ST", "ST"), ("GENERAL", "GEN"), ("GEN", "GEN"), ("EWS", "EWS")]:
            if re.search(r"\b" + cat_label.lower() + r"\b", q):
                predicates.append(QueryPredicate(domain="academic", field="category", value=cat_val))
                break

        # 3. Admission Route predicate
        if "jee" in q:
            predicates.append(QueryPredicate(domain="academic", field="admission_route", value="JEE_MAINS"))
        elif "vsat" in q:
            predicates.append(QueryPredicate(domain="academic", field="admission_route", value="VSAT"))
        elif "management quota" in q:
            predicates.append(QueryPredicate(domain="academic", field="admission_route", value="MANAGEMENT"))

        # 4. Attendance Shortage predicate
        if "attendance shortage" in q or "shortage of attendance" in q or "low attendance" in q or "attendance < 75" in q:
            predicates.append(QueryPredicate(domain="academic", field="attendance", value=75.0, operator="lte"))

        # 5. Financial Status predicate
        if "overdue" in q or "defaulter" in q:
            predicates.append(QueryPredicate(domain="financial", field="status", value="OVERDUE"))
        elif "partially paid" in q:
            predicates.append(QueryPredicate(domain="financial", field="status", value="PARTIALLY_PAID"))
        elif "pending" in q or "unpaid" in q:
            predicates.append(QueryPredicate(domain="financial", field="status", value="PENDING"))
        elif "paid in full" in q or "fully paid" in q:
            predicates.append(QueryPredicate(domain="financial", field="status", value="PAID"))

        # 6. Aging Bucket predicate
        if "bucket 1" in q or "1-30 days" in q:
            predicates.append(QueryPredicate(domain="financial", field="aging_bucket", value="BUCKET_1"))
        elif "bucket 2" in q or "31-60 days" in q:
            predicates.append(QueryPredicate(domain="financial", field="aging_bucket", value="BUCKET_2"))
        elif "bucket 3" in q or "61-90 days" in q:
            predicates.append(QueryPredicate(domain="financial", field="aging_bucket", value="BUCKET_3"))
        elif "bucket 4" in q or "90+ days" in q or "more than 90 days" in q:
            predicates.append(QueryPredicate(domain="financial", field="aging_bucket", value="BUCKET_4"))

        # 7. Reductions (Scholarship, Concession, Waiver)
        if "scholarship" in q:
            predicates.append(QueryPredicate(domain="financial", field="scholarship", value=True))
        if "concession" in q:
            predicates.append(QueryPredicate(domain="financial", field="concession", value=True))
        if "waiver" in q:
            predicates.append(QueryPredicate(domain="financial", field="waiver", value=True))

        # 8. Exam / Hall Ticket Clearance
        has_gate_term = any(t in q for t in ["exam", "hall ticket", "admit card", "clearance"])
        if ("blocked" in q and has_gate_term) or "blocked from exam" in q:
            predicates.append(QueryPredicate(domain="exam", field="clearance", value="BLOCKED"))
        elif any(c in q for c in ["cleared", "eligible", "unlocked"]) and has_gate_term:
            predicates.append(QueryPredicate(domain="exam", field="clearance", value="CLEARED"))
        elif "conditional" in q and has_gate_term:
            predicates.append(QueryPredicate(domain="exam", field="clearance", value="CONDITIONAL_HOLD"))

        return predicates, unmappable

        return predicates, unmappable

    @classmethod
    def build_dag(cls, predicates: List[QueryPredicate], unmappable: List[str]) -> ExecutionDAG:
        """
        Builds a deterministic execution DAG from extracted predicates.
        Independent academic filters run first in a combined step to optimize performance.
        Dependent status and gate filters chain sequentially.
        """
        if not predicates:
            return ExecutionDAG(is_compound=False, predicates=[], steps=[], unmappable_predicates=unmappable)

        steps: List[DAGStep] = []
        step_idx = 1

        # Phase 1: Academic Cohort Predicates (Combined into filter_students)
        academic_preds = [p for p in predicates if p.domain == "academic"]
        if academic_preds:
            prog = next((p.value for p in academic_preds if p.field == "program"), None)
            cat = next((p.value for p in academic_preds if p.field == "category"), None)
            route = next((p.value for p in academic_preds if p.field == "admission_route"), None)
            att = next((p.value for p in academic_preds if p.field == "attendance"), None)

            desc_parts = []
            params: Dict[str, Any] = {}
            if cat:
                params["category_code"] = cat
                desc_parts.append(f"category={cat}")
            if prog:
                params["program_code"] = prog
                desc_parts.append(f"program={prog}")
            if route:
                params["admission_route_code"] = route
                desc_parts.append(f"route={route}")
            if att:
                params["attendance_max"] = att
                desc_parts.append(f"attendance<={att}%")

            desc = f"Filter students by {', '.join(desc_parts)}"
            steps.append(DAGStep(
                step_number=step_idx,
                tool_name="filter_students",
                params=params,
                description=desc,
                depends_on=None
            ))
            step_idx += 1

        # Phase 2: Financial Status Filters
        for p in predicates:
            if p.domain == "financial":
                prev_step = step_idx - 1 if step_idx > 1 else None
                if p.field == "status":
                    steps.append(DAGStep(
                        step_number=step_idx,
                        tool_name="filter_by_payment_status",
                        params={"status": p.value},
                        description=f"Narrow to payment_status={p.value}",
                        depends_on=prev_step
                    ))
                    step_idx += 1
                elif p.field == "aging_bucket":
                    steps.append(DAGStep(
                        step_number=step_idx,
                        tool_name="filter_by_aging_bucket",
                        params={"bucket": p.value},
                        description=f"Narrow to aging_bucket={p.value}",
                        depends_on=prev_step
                    ))
                    step_idx += 1
                elif p.field == "scholarship":
                    steps.append(DAGStep(
                        step_number=step_idx,
                        tool_name="filter_by_scholarship_recipient",
                        params={},
                        description="Narrow to scholarship recipients",
                        depends_on=prev_step
                    ))
                    step_idx += 1
                elif p.field == "waiver":
                    steps.append(DAGStep(
                        step_number=step_idx,
                        tool_name="filter_by_waiver",
                        params={},
                        description="Narrow to fee waiver recipients",
                        depends_on=prev_step
                    ))
                    step_idx += 1

        # Phase 3: Exam Clearance Filters
        for p in predicates:
            if p.domain == "exam":
                prev_step = step_idx - 1 if step_idx > 1 else None
                steps.append(DAGStep(
                    step_number=step_idx,
                    tool_name="filter_by_exam_clearance",
                    params={"status": p.value},
                    description=f"Narrow to exam_clearance={p.value}",
                    depends_on=prev_step
                ))
                step_idx += 1

        # Enforce MAX_DAG_DEPTH guardrail
        if len(steps) > MAX_DAG_DEPTH:
            steps = steps[:MAX_DAG_DEPTH]

        return ExecutionDAG(
            is_compound=len(steps) >= 2,
            predicates=predicates,
            steps=steps,
            unmappable_predicates=unmappable
        )

    @classmethod
    def validate_rbac(cls, dag: ExecutionDAG, current_user: User) -> None:
        """
        All-or-nothing RBAC Gatekeeper:
        Verifies that current_user has authorization to execute EVERY tool in the DAG.
        If any tool is unauthorized, raises HTTP 403 immediately.
        """
        for step in dag.steps:
            tool_def = tool_registry.get_tool(step.tool_name)
            if not tool_def:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Financial tool '{step.tool_name}' in execution plan is not recognized."
                )
            if current_user.role not in tool_def.allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"RBAC Denial: Role '{current_user.role.value if hasattr(current_user.role, 'value') else current_user.role}' is not authorized to execute tool '{step.tool_name}' in this multi-filter query."
                )

    @classmethod
    def execute_dag(
        cls,
        dag: ExecutionDAG,
        db: Session,
        current_user: User,
        client_ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes the planned DAG left-to-right, performing deterministic Python set intersections
        at each step.
        """
        # 1. Check unmappable predicates
        if dag.unmappable_predicates:
            unsupported_str = ", ".join(dag.unmappable_predicates)
            return {
                "status": "UNSUPPORTED_PREDICATE",
                "answer": f"I can filter by academic program, reservation category, admission quota, payment status, aging bucket, and exam hall ticket clearance — I don't yet support filtering by [{unsupported_str}].",
                "tools_used": [],
                "reasoning_trace": [f"Unmappable predicate detected: {unsupported_str}"],
                "financial_data": None,
                "matched_ids": [],
                "count": 0
            }

        # 2. Check empty DAG
        if not dag.steps:
            return {
                "status": "NO_PLAN",
                "answer": "Could not identify financial or academic filter criteria in your query.",
                "tools_used": [],
                "reasoning_trace": [],
                "financial_data": None,
                "matched_ids": [],
                "count": 0
            }

        # 3. RBAC All-or-Nothing check
        cls.validate_rbac(dag, current_user)

        # 4. Sequential DAG Execution with Python Set Intersections
        current_matched_ids: Optional[Set[str]] = None
        tools_executed: List[str] = []
        reasoning_trace: List[str] = []
        last_step_sample: List[Dict[str, Any]] = []

        for step in dag.steps:
            tool_params = dict(step.params)
            if current_matched_ids is not None:
                tool_params["student_ids"] = list(current_matched_ids)

            # Authoritative execution via tool registry
            step_output = tool_registry.execute_tool(
                tool_name=step.tool_name,
                db=db,
                current_user=current_user,
                **tool_params
            )
            tools_executed.append(step.tool_name)

            # Audit log entry for this specific step
            AuditService.log_event(
                db=db,
                action=AuditAction.READ,
                resource_type="AI_MULTI_FILTER_STEP",
                user_id=current_user.id,
                role=current_user.role,
                ip_address=client_ip,
                details={
                    "step": step.step_number,
                    "tool": step.tool_name,
                    "params": {k: str(v) for k, v in tool_params.items() if k != "student_ids"},
                    "matched_count": step_output.get("count", 0)
                }
            )

            step_ids = set(step_output.get("matched_ids", []))
            if current_matched_ids is None:
                current_matched_ids = step_ids
            else:
                # Deterministic Python Set Intersection
                current_matched_ids = current_matched_ids.intersection(step_ids)

            count_now = len(current_matched_ids)
            reasoning_trace.append(f"{step.description} -> {count_now} matched")
            last_step_sample = step_output.get("sample", [])

            # Early exit optimization: If intersection is empty, subsequent steps remain 0
            if count_now == 0:
                break

        final_matched_ids = list(current_matched_ids) if current_matched_ids else []
        final_sample = [s for s in last_step_sample if s["id"] in final_matched_ids][:10]

        return {
            "status": "SUCCESS",
            "matched_ids": final_matched_ids,
            "count": len(final_matched_ids),
            "sample": final_sample,
            "tools_used": tools_executed,
            "reasoning_trace": reasoning_trace,
            "financial_data": {
                "tool": "multi_filter_planner",
                "matched_count": len(final_matched_ids),
                "count": len(final_matched_ids),
                "matched_ids": final_matched_ids,
                "sample": final_sample,
                "students": final_sample,
                "predicates": [p.model_dump() for p in dag.predicates]
            }
        }

    # Method alias for planner API compatibility
    @classmethod
    def build_plan(cls, predicates: List[Any], unmappable: Optional[List[str]] = None) -> List[DAGStep]:
        pred_objs = [
            p if isinstance(p, QueryPredicate) else QueryPredicate(
                domain=p.get("domain", "academic"),
                field=p.get("field", "program"),
                value=p.get("value", "")
            )
            for p in predicates
        ]
        dag = cls.build_dag(pred_objs, unmappable or [])
        return dag.steps[:cls.MAX_DEPTH]

