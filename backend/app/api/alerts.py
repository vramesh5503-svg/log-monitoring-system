"""
Alert routes.

GET /alerts          — paginated, filtered list
GET /alerts/summary  — counts for Alerts page overview cards
GET /alerts/critical — latest CRITICAL alerts (quick access)
"""

import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database.database import get_db
from app.schemas.alert import AlertOut, AlertListResponse, AlertSummary
from app.services.auth_service import get_current_active_user
from app.services.alert_service import get_alerts, get_critical_alerts, get_alert_summary
from app.models.user import User

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/summary", response_model=AlertSummary)
def alert_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Return counts: total, critical, failed_logins, sql_injections, xss, brute_force, malware."""
    return get_alert_summary(db)


@router.get("/critical", response_model=list[AlertOut])
def critical_alerts(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Return the most recent CRITICAL severity alerts."""
    return get_critical_alerts(db, limit=limit)


@router.get("", response_model=AlertListResponse)
def list_alerts(
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    severity:   Optional[str] = Query(None, description="Filter by severity"),
    source_ip:  Optional[str] = Query(None, description="Filter by source IP"),
    start_time: Optional[str] = Query(None, description="ISO datetime lower bound"),
    end_time:   Optional[str] = Query(None, description="ISO datetime upper bound"),
    page:       int = Query(1,  ge=1),
    page_size:  int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Return a paginated list of alerts with optional filters."""
    from datetime import datetime
    from fastapi import HTTPException, status

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

    items, total = get_alerts(
        db,
        alert_type=alert_type,
        severity=severity,
        source_ip=source_ip,
        start_time=_parse_dt(start_time),
        end_time=_parse_dt(end_time),
        page=page,
        page_size=page_size,
    )
    total_pages = math.ceil(total / page_size) if total else 1
    return AlertListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items,
    )
