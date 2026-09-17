"""
Deterministic Rule Engines for Agent 40.
Strictly audit-compliant and explainable financial risk rules.
"""
from app.rules.risk_engine import calculate_default_risk, get_cohort_default_risk

__all__ = ["calculate_default_risk", "get_cohort_default_risk"]
