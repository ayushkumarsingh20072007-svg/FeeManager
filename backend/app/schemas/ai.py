from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Natural language query from user")
    conversation_id: Optional[str] = Field(None, description="Optional conversation identifier")

class AIChatResponse(BaseModel):
    answer: str = Field(..., description="Natural language authoritative response")
    intent: str = Field(..., description="Classified intent of the query")
    tools_used: List[str] = Field(default_factory=list, description="List of read-only financial tools executed")
    reasoning_trace: List[str] = Field(default_factory=list, description="Step-by-step DAG reasoning and filter trace")
    financial_data: Optional[Dict[str, Any]] = Field(None, description="Structured financial payload from tools")
    suggested_prompts: List[str] = Field(default_factory=list, description="Context-aware follow-up suggestions")
    role: str = Field(..., description="Role of the authenticated user")
    status: str = Field("SUCCESS", description="Execution status")
