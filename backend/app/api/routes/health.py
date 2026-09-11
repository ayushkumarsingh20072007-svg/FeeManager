from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """Verifies service health and database connectivity."""
    db_status = "connected"
    try:
        # Execute a light query to verify DB connection
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        details={
            "app_name": settings.APP_NAME,
            "database_type": "sqlite" if settings.DATABASE_URL.startswith("sqlite") else "postgresql"
        }
    )
