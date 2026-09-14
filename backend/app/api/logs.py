"""
Log entry routes.

GET    /logs          — paginated, filtered list
GET    /logs/stats    — dashboard statistics
GET    /logs/{id}     — single log detail
DELETE /logs/{id}     — delete a log entry (admin only)
"""

import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database.database import get_db
from app.schemas.log import LogOut, LogListResponse, DashboardStats
from app.schemas.common import MessageResponse
from app.services.auth_service import get_current_active_user, require_admin
from app.services.log_service import (
    get_logs, get_log_by_id, delete_log, get_dashboard_stats,
)
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["Logs"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """
    Return aggregated dashboard statistics:
    severity counts, hourly events, top IPs, attack categories.
    """
    return get_dashboard_stats(db)


@router.get("", response_model=LogListResponse)
def list_logs(
    # Filters
    severity:   Optional[str] = Query(None, description="Filter by severity level"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    source_ip:  Optional[str] = Query(None, description="Filter by source IP (partial match)"),
    search:     Optional[str] = Query(None, description="Search in message text"),
    start_time: Optional[str] = Query(None, description="ISO datetime lower bound"),
    end_time:   Optional[str] = Query(None, description="ISO datetime upper bound"),
    # Pagination & sort
    page:       int  = Query(1,   ge=1),
    page_size:  int  = Query(50,  ge=1, le=500),
    sort_desc:  bool = Query(True, description="Sort newest first"),
    # Auth
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """
    Return a paginated list of log entries with optional filters.
    """
    from datetime import datetime

    def _parse_dt(val: Optional[str]):
        if not val:
            return None
        try:
            return datetime.fromisoformat(val)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid datetime format: {val}",
            )

    items, total = get_logs(
        db,
        severity=severity,
        event_type=event_type,
        source_ip=source_ip,
        search=search,
        start_time=_parse_dt(start_time),
        end_time=_parse_dt(end_time),
        page=page,
        page_size=page_size,
        sort_desc=sort_desc,
    )
    total_pages = math.ceil(total / page_size) if total else 1
    return LogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items,
    )


@router.get("/{log_id}", response_model=LogOut)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Return details of a single log entry."""
    entry = get_log_by_id(db, log_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found.")
    return entry


@router.delete("/{log_id}", response_model=MessageResponse)
def remove_log(
    log_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),   # Admin only
):
    """
    Delete a log entry and all its associated alerts.
    Requires Admin role.
    """
    if not delete_log(db, log_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found.")
    return MessageResponse(message=f"Log {log_id} deleted successfully.")
