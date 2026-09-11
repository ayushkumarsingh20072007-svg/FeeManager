from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from app.models.users import User, Student, Parent
from app.repositories.base_repository import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .options(
                joinedload(User.student_profile),
                joinedload(User.parent_profile)
            )
            .filter(User.email == email.lower().strip())
            .first()
        )

    def get_user_with_profiles(self, user_id: str) -> Optional[User]:
        return (
            self.db.query(User)
            .options(
                joinedload(User.student_profile),
                joinedload(User.parent_profile)
            )
            .filter(User.id == user_id)
            .first()
        )
