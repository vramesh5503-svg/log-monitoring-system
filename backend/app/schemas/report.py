"""
Pydantic schemas for Report generation requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# ── Request schemas ────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    """
    Body for POST /report.
    period: 'daily' | 'weekly' | 'monthly'
    Optionally override the date range instead of using the preset period.
    """
    period: Literal["daily", "weekly", "monthly"] = "daily"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# ── Response schemas ───────────────────────────────────────────────────────────

class ReportSummary(BaseModel):
    """Top-level metadata for a generated report."""
    period: str
    start_date: datetime
    end_date: datetime
    generated_at: datetime
    total_logs: int
    total_alerts: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int
    top_event_types: list
    top_source_ips: list


class ExportFormat(BaseModel):
    """Returned when an export is available as a download link."""
    format: Literal["csv", "json", "pdf"]
    filename: str
    download_url: str
    generated_at: datetime


# ── Settings / upload schemas ──────────────────────────────────────────────────

class MonitorSettings(BaseModel):
    """Body for configuring the monitoring service."""
    alert_threshold: int = Field(default=5, ge=1, le=100)
    watch_path: Optional[str] = None       # path to watch (server-side)
    email_enabled: bool = False
    email_recipient: Optional[str] = None


class MonitorStatus(BaseModel):
    """Response for /monitor/start and /monitor/stop."""
    is_running: bool
    watch_path: Optional[str] = None
    message: str
