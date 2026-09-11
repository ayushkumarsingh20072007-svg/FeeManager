from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.models.enums import AuditAction, UserRole
from app.models.users import User
from app.repositories.user_repository import UserRepository
from app.services.audit_service import AuditService

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_service = AuditService(db)

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = self.user_repo.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated."
            )
        return user

    def login(self, email: str, password: str, ip_address: Optional[str] = None) -> Dict[str, Any]:
        user = self.authenticate_user(email, password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Build extra claims
        extra_claims = {
            "email": user.email,
            "full_name": user.full_name,
        }
        if user.student_profile:
            extra_claims["student_id"] = user.student_profile.id
            extra_claims["roll_no"] = user.student_profile.roll_no
        if user.parent_profile:
            extra_claims["parent_id"] = user.parent_profile.id

        access_token = create_access_token(
            subject=user.id,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            extra_claims=extra_claims
        )
        refresh_token = create_refresh_token(
            subject=user.id,
            role=user.role.value if hasattr(user.role, "value") else str(user.role)
        )

        # Audit log successful login
        self.audit_service.log(
            action=AuditAction.READ,
            resource_type="USER_SESSION",
            resource_id=user.id,
            user_id=user.id,
            role=user.role,
            reason="User login successful",
            ip_address=ip_address
        )

        user_info = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active,
            "student_id": user.student_profile.id if user.student_profile else None,
            "roll_no": user.student_profile.roll_no if user.student_profile else None,
            "parent_id": user.parent_profile.id if user.parent_profile else None,
        }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user_info
        }

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        user_id = payload.get("sub")
        user = self.user_repo.get_user_with_profiles(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )

        extra_claims = {
            "email": user.email,
            "full_name": user.full_name,
        }
        if user.student_profile:
            extra_claims["student_id"] = user.student_profile.id
            extra_claims["roll_no"] = user.student_profile.roll_no

        new_access_token = create_access_token(
            subject=user.id,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            extra_claims=extra_claims
        )
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
