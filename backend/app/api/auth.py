"""
Authentication routes.

POST /auth/register  — create a new account
POST /auth/login     — exchange credentials for a JWT
GET  /auth/me        — return the current authenticated user
POST /auth/logout    — client-side token invalidation (stateless JWT)
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.user import UserRegister, UserLogin, UserOut, Token
from app.schemas.common import MessageResponse
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    get_current_active_user,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account.

    - Validates username uniqueness and email uniqueness.
    - Stores a bcrypt-hashed password.
    - Returns the created user (no password field).
    """
    user = create_user(
        db,
        username=payload.username,
        email=payload.email,
        password=payload.password,
    )
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate and return a signed JWT access token.

    The token must be passed as `Authorization: Bearer <token>` on every
    subsequent protected request.
    """
    from fastapi import HTTPException
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    # Update last_login timestamp
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
    )
    return Token(access_token=token, token_type="bearer", user=user)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_active_user)):
    """Return the profile of the currently authenticated user."""
    return current_user


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout endpoint.

    JWTs are stateless — the client should discard the token.
    In a production system add the JTI to a Redis blocklist here.
    """
    return MessageResponse(message=f"Goodbye, {current_user.username}.")
