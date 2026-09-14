"""
Alert ORM model — raised when a log entry matches a detection rule.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database.database import Base


class AlertType(str, enum.Enum):
    FAILED_LOGIN        = "FAILED_LOGIN"
    SSH_AUTH_FAILURE    = "SSH_AUTH_FAILURE"
    SQL_INJECTION       = "SQL_INJECTION"
    XSS                 = "XSS"
    BRUTE_FORCE         = "BRUTE_FORCE"
    PORT_SCAN           = "PORT_SCAN"
    MALWARE             = "MALWARE"
    SUSPICIOUS_IP       = "SUSPICIOUS_IP"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    GENERIC             = "GENERIC"


class AlertSeverity(str, enum.Enum):
    INFO     = "INFO"
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class Alert(Base):
    __tablename__ = "alerts"

    id         = Column(Integer, primary_key=True, index=True)
    log_id     = Column(Integer, ForeignKey("logs.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(Enum(AlertType), nullable=False, index=True)
    severity   = Column(Enum(AlertSeverity), nullable=False, index=True)
    description= Column(Text, nullable=True)
    source_ip  = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationship back to the originating log entry
    log = relationship("LogEntry", back_populates="alerts")

    def __repr__(self):
        return f"<Alert id={self.id} type={self.alert_type} severity={self.severity}>"
