from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.users import User
from app.models.enums import AuditAction
from app.schemas.ai import AIChatResponse
from app.services.audit_service import AuditService
from app.ai.guardrails import Guardrails
from app.ai.intent_router import IntentRouter
from app.ai.tool_registry import tool_registry
from app.ai.providers import get_ai_provider
from app.ai.planner import QueryPlanner

class FinanceAgent:
    def __init__(self):
        self.provider = get_ai_provider()

    def process_query(
        self,
        query: str,
        db: Session,
        current_user: User,
        client_ip: Optional[str] = None
    ) -> AIChatResponse:
        """
        Orchestrates end-to-end processing of natural language queries with full security and audit logging.
        Routes compound multi-criteria queries to QueryPlanner DAG executor.
        """
        role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

        # 1. Guardrail Inspection
        is_safe, guardrail_msg = Guardrails.inspect_query(query, current_user)
        if not is_safe:
            # Safe audit log of rejected query attempt
            AuditService.log_event(
                db=db,
                action=AuditAction.READ,
                resource_type="AI_AGENT_GUARDRAIL_INTERCEPT",
                user_id=current_user.id,
                role=current_user.role,
                ip_address=client_ip,
                details={
                    "query_excerpt": query[:100],
                    "status": "GUARDRAIL_INTERCEPTED",
                    "reason": guardrail_msg
                }
            )
            return AIChatResponse(
                answer=guardrail_msg or "Query blocked by safety guardrails.",
                intent="GUARDRAIL_BLOCKED",
                tools_used=[],
                reasoning_trace=["Blocked by safety guardrails"],
                financial_data=None,
                suggested_prompts=["What is my outstanding fee?", "Show my fee breakup", "Show my payment history"],
                role=role_str,
                status="GUARDRAIL_INTERCEPTED"
            )

        # 2. Check for Compound Multi-Filter Queries -> Query Planner DAG Executor
        if QueryPlanner.is_compound_query(query):
            predicates, unmappable = QueryPlanner.extract_predicates(query)
            dag = QueryPlanner.build_dag(predicates, unmappable)

            if dag.steps or dag.unmappable_predicates:
                planner_res = QueryPlanner.execute_dag(dag, db, current_user, client_ip)
                if planner_res["status"] == "UNSUPPORTED_PREDICATE":
                    return AIChatResponse(
                        answer=planner_res["answer"],
                        intent="UNSUPPORTED_PREDICATE",
                        tools_used=[],
                        reasoning_trace=planner_res["reasoning_trace"],
                        financial_data=None,
                        suggested_prompts=["Show overdue students in CSE", "Show fee collection by program"],
                        role=role_str,
                        status="UNSUPPORTED_PREDICATE"
                    )

                # Format natural language response using authoritative data
                answer = self.provider.generate_response(
                    user_query=query,
                    tool_name="multi_filter_planner",
                    tool_data=planner_res["financial_data"] or {},
                    user_role=role_str
                )

                # Append-Only Audit Trail for entire compound query
                AuditService.log_event(
                    db=db,
                    action=AuditAction.READ,
                    resource_type="AI_MULTI_FILTER_QUERY",
                    user_id=current_user.id,
                    role=current_user.role,
                    ip_address=client_ip,
                    details={
                        "query": query[:200],
                        "tools_executed": planner_res["tools_used"],
                        "matched_count": planner_res["count"],
                        "status": "SUCCESS"
                    }
                )

                return AIChatResponse(
                    answer=answer,
                    intent="MULTI_FILTER_REASONING",
                    tools_used=planner_res["tools_used"],
                    reasoning_trace=planner_res["reasoning_trace"],
                    financial_data=planner_res["financial_data"],
                    suggested_prompts=[
                        "Show overdue students in CSE",
                        "Show payment reconciliation exceptions",
                        "Show fee collection by program"
                    ],
                    role=role_str,
                    status="SUCCESS"
                )

        # 3. Intent Routing & Parameter Extraction (Single-Tool Flow)
        intent, tool_name, raw_params, suggested_prompts = IntentRouter.route_intent(query, current_user)

        # 3. Parameter Sanitization & RBAC verification
        sanitized_params = Guardrails.sanitize_parameters(raw_params, current_user)
        Guardrails.validate_tool_access(tool_name, current_user)

        # 4. Authoritative Tool Execution
        tool_data: Dict[str, Any] = {}
        try:
            tool_data = tool_registry.execute_tool(
                tool_name=tool_name,
                db=db,
                current_user=current_user,
                **sanitized_params
            )
        except HTTPException as e:
            AuditService.log_event(
                db=db,
                action=AuditAction.READ,
                resource_type="AI_FINANCIAL_QUERY_ERROR",
                user_id=current_user.id,
                role=current_user.role,
                ip_address=client_ip,
                details={
                    "query": query[:150],
                    "tool": tool_name,
                    "error_detail": e.detail,
                    "status_code": e.status_code
                }
            )
            raise e

        # 5. Natural Language Response Generation from Exact Tool Data
        role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        answer = self.provider.generate_response(
            user_query=query,
            tool_name=tool_name,
            tool_data=tool_data,
            user_role=role_str
        )

        # 6. Append-Only Audit Trail
        AuditService.log_event(
            db=db,
            action=AuditAction.READ,
            resource_type="AI_FINANCIAL_QUERY",
            user_id=current_user.id,
            role=current_user.role,
            ip_address=client_ip,
            details={
                "intent": intent,
                "tool_invoked": tool_name,
                "target_student": sanitized_params.get("student_id") or sanitized_params.get("roll_no"),
                "status": "SUCCESS"
            }
        )

        return AIChatResponse(
            answer=answer,
            intent=intent,
            tools_used=[tool_name],
            reasoning_trace=[f"Executed single authoritative tool: {tool_name}"],
            financial_data=tool_data,
            suggested_prompts=suggested_prompts,
            role=role_str,
            status="SUCCESS"
        )

# Global agent instance
finance_agent = FinanceAgent()
