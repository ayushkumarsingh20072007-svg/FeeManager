from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class RiskFactorBreakdown(BaseModel):
    factor: str = Field(..., description="Name of the risk factor")
    points: int = Field(..., description="Points contributed by this factor to total risk score")
    max_points: int = Field(..., description="Maximum possible points for this factor")
    explanation: str = Field(..., description="Human-readable explanation of why this score was assigned")

class RiskScoreResponse(BaseModel):
    student_id: str
    roll_no: str
    student_name: str
    program_code: Optional[str] = None
    risk_score: int = Field(..., ge=0, le=100, description="Total risk score between 0 and 100")
    risk_tier: str = Field(..., description="LOW (0-30), MEDIUM (31-60), or HIGH (61-100)")
    contributing_factors: List[RiskFactorBreakdown]
    calculated_at: date

class HighRiskStudentsResponse(BaseModel):
    count: int
    min_score: int
    program_filter: Optional[str] = None
    students: List[RiskScoreResponse]
