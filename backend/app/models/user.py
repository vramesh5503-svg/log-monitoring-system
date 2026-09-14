"""
User ORM model — stores credentials and role information.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String(50), unique=True, index=True, nullable=False)
    email      = Column(String(120), unique=True, index=True, nullable=False)
    password   = Column(String(255), nullable=False)          # bcrypt hash
    role       = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User id={self.id} username={self.username} role={self.role}>"
