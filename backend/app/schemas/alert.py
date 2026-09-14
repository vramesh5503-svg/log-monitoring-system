"""
Pydantic schemas for Alert — list, detail, and critical-alert responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.alert import AlertType, AlertSeverity


# ── Response schemas ───────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    """Single alert entry returned by the API."""
    id: int
    log_id: int
    alert_type: AlertType
    severity: AlertSeverity
    description: Optional[str] = None
    source_ip: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    """Paginated list of alerts."""
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[AlertOut]


class AlertFilter(BaseModel):
    """Query-parameter model for filtering alert lists."""
    alert_type: Optional[AlertType] = None
    severity: Optional[AlertSeverity] = None
    source_ip: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)


class AlertSummary(BaseModel):
    """Counts used on the Alerts page overview."""
    total: int
    critical: int
    failed_logins: int
    sql_injections: int
    xss_attacks: int
    brute_force: int
    malware: int
