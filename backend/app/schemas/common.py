"""
Shared utility schemas reused across multiple endpoints.
"""

from pydantic import BaseModel
from typing import Optional, Any


class MessageResponse(BaseModel):
    """Generic success/info message response."""
    message: str
    detail: Optional[Any] = None


class ErrorResponse(BaseModel):
    """Standardised error shape returned with 4xx/5xx responses."""
    error: str
    detail: Optional[str] = None
    status_code: int


class PaginationMeta(BaseModel):
    """Reusable pagination metadata block."""
    total: int
    page: int
    page_size: int
    total_pages: int
