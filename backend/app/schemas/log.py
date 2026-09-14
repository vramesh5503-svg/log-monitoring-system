"""
Pydantic schemas for LogEntry — list, detail, filter, and stats responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.log import SeverityLevel


# ── Request schemas ────────────────────────────────────────────────────────────

class LogFilter(BaseModel):
    """Query-parameter model for filtering log lists."""
    severity: Optional[SeverityLevel] = None
    event_type: Optional[str] = None
    source_ip: Optional[str] = None
    search: Optional[str] = None          # free-text search in message
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)
    sort_desc: bool = True                 # newest first by default


# ── Response schemas ───────────────────────────────────────────────────────────

class LogOut(BaseModel):
    """Single log entry returned by the API."""
    id: int
    timestamp: datetime
    message: str
    severity: SeverityLevel
    source_ip: Optional[str] = None
    event_type: Optional[str] = None
    source: Optional[str] = None
    raw_line: Optional[str] = None

    model_config = {"from_attributes": True}


class LogListResponse(BaseModel):
    """Paginated list of log entries."""
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[LogOut]


class SeverityCount(BaseModel):
    """Used in stats: how many logs per severity level."""
    severity: str
    count: int


class HourlyEvent(BaseModel):
    """Used in charts: events grouped by hour."""
    hour: str          # ISO-formatted hour string e.g. "2024-01-15T14:00"
    count: int


class TopIP(BaseModel):
    """Used in charts: most frequently seen attacker IPs."""
    source_ip: str
    count: int


class CategoryCount(BaseModel):
    """Used in charts: event type distribution."""
    event_type: str
    count: int


class DashboardStats(BaseModel):
    """Aggregated numbers shown on the dashboard overview cards."""
    total_logs: int
    critical: int
    high: int
    medium: int
    low: int
    info: int
    today_events: int
    total_alerts: int
    severity_distribution: List[SeverityCount]
    hourly_events: List[HourlyEvent]
    top_ips: List[TopIP]
    attack_categories: List[CategoryCount]
