"""
Authentication service — password hashing, JWT creation/verification,
and FastAPI dependency helpers for protected routes.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import bcrypt
from app.database.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import TokenData
from app.utils.config import settings

# ── Password hashing ──────────────────────────────────────────────────────────

# bcrypt is the recommended algorithm; auto_update keeps old hashes working
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── JWT bearer extractor (reads "Authorization: Bearer <token>") ──────────────

bearer_scheme = HTTPBearer()


# ── Core helpers ──────────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Return bcrypt hash of *plain_password*."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")
    except Exception:
        return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches *hashed_password*."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Encode *data* into a signed JWT.

    Args:
        data: Claims to embed (must include at least 'sub').
        expires_delta: Custom TTL; falls back to settings.ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> TokenData:
    """
    Decode and validate a JWT.

    Raises:
        HTTPException 401 if the token is invalid or expired.

    Returns:
        TokenData with user_id, username, and role.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: Optional[int] = payload.get("user_id")
        username: Optional[str] = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if username is None or user_id is None:
            raise credentials_exception
        return TokenData(user_id=user_id, username=username, role=role)
    except JWTError:
        raise credentials_exception


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Verify username + password.

    Returns:
        User ORM object on success, None on failure.
    """
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user


def create_user(db: Session, username: str, email: str, password: str, role: UserRole = UserRole.user) -> User:
    """
    Persist a new User with a hashed password.

    Raises:
        HTTPException 400 if username or email is already taken.
    """
    if get_user_by_username(db, username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered.",
        )
    if get_user_by_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    user = User(
        username=username,
        email=email,
        password=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── FastAPI dependency injectors ──────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency — extracts and validates the Bearer token,
    then fetches the user from the database.

    Usage::

        @router.get("/protected")
        def protected(user: User = Depends(get_current_user)):
            ...
    """
    token_data = decode_access_token(credentials.credentials)
    user = get_user_by_id(db, token_data.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
        )
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Convenience dependency — same as get_current_user but also checks is_active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account.",
        )
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Role-based dependency — only Admin users may call routes that use this.

    Raises:
        HTTPException 403 for non-admin users.
    """
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
