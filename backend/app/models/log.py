"""
Log ORM model — each row represents one parsed log entry.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database.database import Base


class SeverityLevel(str, enum.Enum):
    INFO     = "INFO"
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class LogEntry(Base):
    __tablename__ = "logs"

    id         = Column(Integer, primary_key=True, index=True)
    timestamp  = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    message    = Column(Text, nullable=False)
    severity   = Column(Enum(SeverityLevel), default=SeverityLevel.INFO, index=True)
    source_ip  = Column(String(45), nullable=True, index=True)   # supports IPv6
    event_type = Column(String(100), nullable=True, index=True)
    source     = Column(String(255), nullable=True)               # file or host origin
    raw_line   = Column(Text, nullable=True)                      # original unparsed line

    # Back-reference: one log can spawn multiple alerts
    alerts = relationship("Alert", back_populates="log", cascade="all, delete-orphan")

    # Composite index for common dashboard query: severity + timestamp
    __table_args__ = (
        Index("ix_logs_severity_ts", "severity", "timestamp"),
    )

    def __repr__(self):
        return f"<LogEntry id={self.id} severity={self.severity} event={self.event_type}>"
