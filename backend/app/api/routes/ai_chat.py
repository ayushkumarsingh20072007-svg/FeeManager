from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.users import User
from app.schemas.ai import AIChatRequest, AIChatResponse
from app.ai.agent import finance_agent

router = APIRouter(tags=["AI Fee & Finance Intelligence Agent"])

@router.post("/ai/chat", response_model=AIChatResponse, status_code=status.HTTP_200_OK)
@router.post("/agent/query", response_model=AIChatResponse, status_code=status.HTTP_200_OK)
def chat_with_finance_agent(
    payload: AIChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AIChatResponse:
    """
    Processes natural-language financial queries using authenticated, role-checked,
    deterministic backend finance tools with append-only audit trail.
    """
    client_ip = request.client.host if request.client else None
    return finance_agent.process_query(
        query=payload.message,
        db=db,
        current_user=current_user,
        client_ip=client_ip
    )
