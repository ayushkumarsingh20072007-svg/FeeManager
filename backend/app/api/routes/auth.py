from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest, UserProfileResponse
from app.services.auth_service import AuthService
from app.api.deps import get_current_user, get_client_ip
from app.models.users import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates user with email and password, returning JWT access and refresh tokens."""
    ip = get_client_ip(request)
    auth_service = AuthService(db)
    return auth_service.login(email=body.email, password=body.password, ip_address=ip)

@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and active role."""
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        phone=current_user.phone,
        is_active=current_user.is_active,
        student_id=current_user.student_profile.id if current_user.student_profile else None,
        roll_no=current_user.student_profile.roll_no if current_user.student_profile else None,
        parent_id=current_user.parent_profile.id if current_user.parent_profile else None,
    )

@router.post("/refresh")
def refresh_token(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refreshes expired access token using a valid refresh token."""
    auth_service = AuthService(db)
    return auth_service.refresh_access_token(body.refresh_token)
