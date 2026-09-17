from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.enums import UserRole

class LoginRequest(BaseModel):
    email: str  # Accepts either email address or Student ID (Roll No, e.g. STU1001)
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    is_active: bool
    student_id: Optional[str] = None
    roll_no: Optional[str] = None
    parent_id: Optional[str] = None
