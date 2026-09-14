"""
Pydantic schemas for User — request bodies, response shapes, and JWT token payloads.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


# ── Request schemas ────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    """Payload for POST /register"""
    username: str = Field(..., min_length=3, max_length=50, examples=["john_doe"])
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["SecurePass123!"])

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Enforce at least one digit and one letter."""
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v


class UserLogin(BaseModel):
    """Payload for POST /login"""
    username: str = Field(..., examples=["john_doe"])
    password: str = Field(..., examples=["SecurePass123!"])


class UserUpdate(BaseModel):
    """Optional fields for updating a user profile."""
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)


# ── Response schemas ───────────────────────────────────────────────────────────

class UserOut(BaseModel):
    """Safe user representation — password is never returned."""
    id: int
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Token schemas ──────────────────────────────────────────────────────────────

class Token(BaseModel):
    """Returned by /login on success."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenData(BaseModel):
    """Decoded payload stored inside a JWT."""
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None
