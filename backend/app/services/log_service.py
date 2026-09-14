"""
Log query service — all database read operations for logs and dashboard stats.
Keeps query logic out of the API routers.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple

from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session

from app.models.log import LogEntry, SeverityLevel
from app.models.alert import Alert, AlertType
from app.schemas.log import (
    DashboardStats, SeverityCount, HourlyEvent, TopIP, CategoryCount,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Log queries
# ─────────────────────────────────────────────────────────────────────────────

def get_logs(
    db: Session,
    severity:   Optional[str]      = None,
    event_type: Optional[str]      = None,
    source_ip:  Optional[str]      = None,
    search:     Optional[str]      = None,
    start_time: Optional[datetime] = None,
    end_time:   Optional[datetime] = None,
    page:       int                = 1,
    page_size:  int                = 50,
    sort_desc:  bool               = True,
) -> Tuple[List[LogEntry], int]:
    """
    Paginated, filtered log query.

    Returns:
        (items, total_count)
    """
    q = db.query(LogEntry)

    if severity:
        q = q.filter(LogEntry.severity == severity)
    if event_type:
        q = q.filter(LogEntry.event_type == event_type)
    if source_ip:
        q = q.filter(LogEntry.source_ip.ilike(f"%{source_ip}%"))
    if search:
        q = q.filter(LogEntry.message.ilike(f"%{search}%"))
    if start_time:
        q = q.filter(LogEntry.timestamp >= start_time)
    if end_time:
        q = q.filter(LogEntry.timestamp <= end_time)

    total = q.count()

    order = desc(LogEntry.timestamp) if sort_desc else asc(LogEntry.timestamp)
    items = q.order_by(order).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_log_by_id(db: Session, log_id: int) -> Optional[LogEntry]:
    return db.query(LogEntry).filter(LogEntry.id == log_id).first()


def delete_log(db: Session, log_id: int) -> bool:
    """Delete a log entry (and its alerts via cascade). Returns True if found."""
    entry = get_log_by_id(db, log_id)
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard statistics
# ─────────────────────────────────────────────────────────────────────────────

def get_dashboard_stats(db: Session) -> DashboardStats:
    """
    Compute all numbers needed by the frontend dashboard in one go.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # ── Severity counts ───────────────────────────────────────────────────────
    sev_rows = (
        db.query(LogEntry.severity, func.count(LogEntry.id))
        .group_by(LogEntry.severity)
        .all()
    )
    sev_map = {row[0].value: row[1] for row in sev_rows}

    # ── Today's events ────────────────────────────────────────────────────────
    today_count = (
        db.query(func.count(LogEntry.id))
        .filter(LogEntry.timestamp >= today_start)
        .scalar() or 0
    )

    # ── Total logs & alerts ───────────────────────────────────────────────────
    total_logs   = db.query(func.count(LogEntry.id)).scalar() or 0
    total_alerts = db.query(func.count(Alert.id)).scalar() or 0

    # ── Severity distribution list ────────────────────────────────────────────
    severity_distribution = [
        SeverityCount(severity=s.value, count=sev_map.get(s.value, 0))
        for s in SeverityLevel
    ]

    # ── Hourly events (last 24 h) ─────────────────────────────────────────────
    since_24h = now - timedelta(hours=24)
    if db.bind and db.bind.dialect.name == "postgresql":
        hour_expr = func.to_char(LogEntry.timestamp, 'YYYY-MM-DD"T"HH24:00')
    else:
        hour_expr = func.strftime("%Y-%m-%dT%H:00", LogEntry.timestamp)

    hourly_rows = (
        db.query(
            hour_expr.label("hour"),
            func.count(LogEntry.id).label("count"),
        )
        .filter(LogEntry.timestamp >= since_24h)
        .group_by("hour")
        .order_by("hour")
        .all()
    )
    hourly_events = [HourlyEvent(hour=row.hour, count=row.count) for row in hourly_rows]

    # ── Top attacker IPs (top 10) ─────────────────────────────────────────────
    ip_rows = (
        db.query(LogEntry.source_ip, func.count(LogEntry.id).label("cnt"))
        .filter(LogEntry.source_ip.isnot(None))
        .group_by(LogEntry.source_ip)
        .order_by(desc("cnt"))
        .limit(10)
        .all()
    )
    top_ips = [TopIP(source_ip=row.source_ip, count=row.cnt) for row in ip_rows]

    # ── Attack categories ─────────────────────────────────────────────────────
    cat_rows = (
        db.query(LogEntry.event_type, func.count(LogEntry.id).label("cnt"))
        .filter(LogEntry.event_type.isnot(None))
        .group_by(LogEntry.event_type)
        .order_by(desc("cnt"))
        .limit(10)
        .all()
    )
    attack_categories = [
        CategoryCount(event_type=row.event_type, count=row.cnt) for row in cat_rows
    ]

    return DashboardStats(
        total_logs            = total_logs,
        critical              = sev_map.get("CRITICAL", 0),
        high                  = sev_map.get("HIGH", 0),
        medium                = sev_map.get("MEDIUM", 0),
        low                   = sev_map.get("LOW", 0),
        info                  = sev_map.get("INFO", 0),
        today_events          = today_count,
        total_alerts          = total_alerts,
        severity_distribution = severity_distribution,
        hourly_events         = hourly_events,
        top_ips               = top_ips,
        attack_categories     = attack_categories,
    )
