"""
General-purpose utility functions used across the application.
"""

import math
import re
from datetime import datetime, timezone
from typing import Any, List, Optional, TypeVar

T = TypeVar("T")


def paginate(query, page: int, page_size: int):
    """
    Apply LIMIT/OFFSET to a SQLAlchemy query and return (items, total, total_pages).

    Args:
        query:     SQLAlchemy Query object (already filtered/ordered).
        page:      1-based page number.
        page_size: Number of items per page.

    Returns:
        Tuple of (items list, total count, total pages).
    """
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total, total_pages


def utc_now() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


def extract_ip(text: str) -> Optional[str]:
    """
    Extract the first IPv4 address found in *text*.
    Returns None if no IP is present.
    """
    pattern = r"\b(?:\d{1,3}\.){3}\d{1,3}\b"
    match = re.search(pattern, text)
    return match.group() if match else None


def extract_ipv6(text: str) -> Optional[str]:
    """
    Extract the first IPv6 address found in *text*.
    Returns None if no IPv6 address is present.
    """
    pattern = r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b"
    match = re.search(pattern, text)
    return match.group() if match else None


def sanitize_filename(name: str) -> str:
    """Strip characters that are unsafe in file names."""
    return re.sub(r"[^\w\-.]", "_", name)


def truncate(text: str, max_len: int = 200) -> str:
    """Truncate *text* to *max_len* characters, appending '…' if truncated."""
    return text if len(text) <= max_len else text[: max_len - 1] + "…"
