"""
Alert query service — all database read operations for the Alerts page.
"""

import logging
from datetime import datetime
from typing import Optional, List, Tuple

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertType, AlertSeverity
from app.schemas.alert import AlertSummary

logger = logging.getLogger(__name__)


def get_alerts(
    db: Session,
    alert_type: Optional[str]      = None,
    severity:   Optional[str]      = None,
    source_ip:  Optional[str]      = None,
    start_time: Optional[datetime] = None,
    end_time:   Optional[datetime] = None,
    page:       int                = 1,
    page_size:  int                = 50,
) -> Tuple[List[Alert], int]:
    """
    Paginated, filtered alert query.

    Returns:
        (items, total_count)
    """
    q = db.query(Alert)

    if alert_type:
        q = q.filter(Alert.alert_type == alert_type)
    if severity:
        q = q.filter(Alert.severity == severity)
    if source_ip:
        q = q.filter(Alert.source_ip.ilike(f"%{source_ip}%"))
    if start_time:
        q = q.filter(Alert.created_at >= start_time)
    if end_time:
        q = q.filter(Alert.created_at <= end_time)

    total = q.count()
    items = (
        q.order_by(desc(Alert.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def get_critical_alerts(db: Session, limit: int = 100) -> List[Alert]:
    """Return the most recent CRITICAL alerts."""
    return (
        db.query(Alert)
        .filter(Alert.severity == AlertSeverity.CRITICAL)
        .order_by(desc(Alert.created_at))
        .limit(limit)
        .all()
    )


def get_alert_summary(db: Session) -> AlertSummary:
    """Counts used on the Alerts page overview cards."""
    total     = db.query(func.count(Alert.id)).scalar() or 0
    critical  = db.query(func.count(Alert.id)).filter(Alert.severity == AlertSeverity.CRITICAL).scalar() or 0
    failed    = db.query(func.count(Alert.id)).filter(Alert.alert_type == AlertType.FAILED_LOGIN).scalar() or 0
    sql_inj   = db.query(func.count(Alert.id)).filter(Alert.alert_type == AlertType.SQL_INJECTION).scalar() or 0
    xss       = db.query(func.count(Alert.id)).filter(Alert.alert_type == AlertType.XSS).scalar() or 0
    brute     = db.query(func.count(Alert.id)).filter(Alert.alert_type == AlertType.BRUTE_FORCE).scalar() or 0
    malware   = db.query(func.count(Alert.id)).filter(Alert.alert_type == AlertType.MALWARE).scalar() or 0

    return AlertSummary(
        total         = total,
        critical      = critical,
        failed_logins = failed,
        sql_injections= sql_inj,
        xss_attacks   = xss,
        brute_force   = brute,
        malware       = malware,
    )
