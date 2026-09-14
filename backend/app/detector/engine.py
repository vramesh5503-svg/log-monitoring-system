"""
Detection engine — runs every parsed log line through all detection rules,
persists LogEntry rows, generates Alert rows, and triggers email notifications
for high/critical severities.

Usage (called from monitoring service and upload handler):

    from app.detector.engine import DetectionEngine
    engine = DetectionEngine(db_session)
    engine.process_line(raw_line, source_name="auth.log")
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.detector.rules import DETECTION_RULES, SEVERITY_ORDER
from app.detector.log_parser import parse_line
from app.models.log import LogEntry, SeverityLevel
from app.models.alert import Alert, AlertSeverity
from app.utils.config import settings
from app.utils.email_service import send_alert_email

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Brute-force window tracker (in-memory per-process)
# For production, replace with Redis sorted sets.
# ─────────────────────────────────────────────────────────────────────────────
_failed_attempts: dict[str, list[float]] = {}


def _track_brute_force(source_ip: str) -> bool:
    """
    Return True when *source_ip* has exceeded ALERT_THRESHOLD failed
    attempts within BRUTE_FORCE_WINDOW seconds.
    """
    import time
    now = time.time()
    window = settings.BRUTE_FORCE_WINDOW
    threshold = settings.ALERT_THRESHOLD

    attempts = _failed_attempts.get(source_ip, [])
    # Prune timestamps outside the window
    attempts = [t for t in attempts if now - t < window]
    attempts.append(now)
    _failed_attempts[source_ip] = attempts

    return len(attempts) >= threshold


# ─────────────────────────────────────────────────────────────────────────────
# Engine
# ─────────────────────────────────────────────────────────────────────────────

class DetectionEngine:
    """
    Stateless processor (DB session is the only mutable state).
    One instance per HTTP request or monitoring thread is fine.
    """

    def __init__(self, db: Session, websocket_manager=None):
        """
        Args:
            db:                 Active SQLAlchemy session.
            websocket_manager:  Optional ConnectionManager for real-time push.
        """
        self.db = db
        self.ws  = websocket_manager

    # ── Public interface ──────────────────────────────────────────────────────

    def process_line(self, raw_line: str, source_name: str = "unknown") -> Optional[LogEntry]:
        """
        Parse *raw_line*, evaluate all detection rules, persist results.

        Returns:
            The created LogEntry ORM object (or None for blank lines).
        """
        if not raw_line.strip():
            return None

        parsed = parse_line(raw_line, source_name)

        # Default severity — upgraded by matching rules
        highest_severity = SeverityLevel.INFO

        # Run all rules, collect matches
        matched_rules = []
        for rule in DETECTION_RULES:
            if rule["pattern"].search(parsed.message) or rule["pattern"].search(raw_line):
                matched_rules.append(rule)
                rule_sev = rule["severity"].value
                if SEVERITY_ORDER.get(rule_sev, 0) > SEVERITY_ORDER.get(highest_severity.value, 0):
                    highest_severity = SeverityLevel(rule_sev)

        # Determine event_type from first (highest-priority) match
        event_type = matched_rules[0]["event_type"] if matched_rules else "GENERIC"

        # ── Brute-force heuristic (separate from keyword rules) ───────────────
        if parsed.source_ip and matched_rules:
            first_type = matched_rules[0]["alert_type"].value
            if first_type in ("FAILED_LOGIN", "SSH_AUTH_FAILURE"):
                if _track_brute_force(parsed.source_ip):
                    from app.models.alert import AlertType
                    brute_rule = {
                        "alert_type":  AlertType.BRUTE_FORCE,
                        "severity":    AlertSeverity.CRITICAL,
                        "description": f"Brute force threshold exceeded from {parsed.source_ip}",
                        "event_type":  "BRUTE_FORCE",
                    }
                    # Only add if not already matched
                    if not any(r["alert_type"].value == "BRUTE_FORCE" for r in matched_rules):
                        matched_rules.append(brute_rule)
                    highest_severity = SeverityLevel.CRITICAL

        # ── Persist LogEntry ──────────────────────────────────────────────────
        log_entry = LogEntry(
            timestamp  = parsed.timestamp,
            message    = parsed.message,
            severity   = highest_severity,
            source_ip  = parsed.source_ip,
            event_type = event_type,
            source     = parsed.source,
            raw_line   = parsed.raw_line,
        )
        self.db.add(log_entry)
        self.db.flush()  # assigns log_entry.id without full commit

        # ── Persist Alerts ────────────────────────────────────────────────────
        for rule in matched_rules:
            alert = Alert(
                log_id     = log_entry.id,
                alert_type = rule["alert_type"],
                severity   = rule["severity"],
                description= rule.get("description", ""),
                source_ip  = parsed.source_ip,
            )
            self.db.add(alert)

            # Send email for HIGH and CRITICAL
            if rule["severity"].value in ("HIGH", "CRITICAL"):
                self._maybe_send_email(rule, parsed.source_ip)

        self.db.commit()
        self.db.refresh(log_entry)

        # ── Real-time WebSocket push ──────────────────────────────────────────
        if self.ws and matched_rules:
            import asyncio, json
            payload = json.dumps({
                "type":      "new_alert",
                "log_id":    log_entry.id,
                "severity":  highest_severity.value,
                "event_type": event_type,
                "source_ip": parsed.source_ip,
                "message":   parsed.message[:200],
            })
            # Fire-and-forget in sync context
            try:
                loop = asyncio.get_event_loop()
                loop.create_task(self.ws.broadcast(payload))
            except RuntimeError:
                pass  # no running loop in this thread — skip push

        if matched_rules:
            logger.info(
                "DETECTED %s rules in line from %s | severity=%s",
                len(matched_rules), source_name, highest_severity.value,
            )

        return log_entry

    def process_file(self, file_path: str) -> int:
        """
        Read an entire log file and process every line.

        Returns:
            Number of lines processed.
        """
        count = 0
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as fh:
                for raw_line in fh:
                    self.process_line(raw_line, source_name=file_path)
                    count += 1
        except OSError as exc:
            logger.error("Cannot read log file %s: %s", file_path, exc)
        return count

    # ── Private helpers ───────────────────────────────────────────────────────

    def _maybe_send_email(self, rule: dict, source_ip: Optional[str]) -> None:
        """Send alert email if a recipient is configured in settings."""
        recipient = settings.EMAIL_USER  # reuse sender as default recipient
        if recipient:
            send_alert_email(
                recipient   = recipient,
                alert_type  = rule["alert_type"].value,
                severity    = rule["severity"].value,
                description = rule.get("description", ""),
                source_ip   = source_ip,
            )
