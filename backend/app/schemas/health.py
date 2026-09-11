from typing import Optional, Dict, Any
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    database: str
    version: str
    environment: str
    details: Optional[Dict[str, Any]] = None
