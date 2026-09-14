"""
Email alert service — sends SMTP notifications when critical alerts are raised.
Falls back gracefully when email config is not set.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.utils.config import settings

logger = logging.getLogger(__name__)


def _build_alert_html(alert_type: str, severity: str, description: str, source_ip: Optional[str]) -> str:
    """Render a simple HTML email body for an alert notification."""
    ip_row = f"<tr><td><b>Source IP</b></td><td>{source_ip}</td></tr>" if source_ip else ""
    return f"""
    <html><body style="font-family: Arial, sans-serif; background:#0f172a; color:#e2e8f0; padding:20px;">
      <div style="max-width:600px;margin:auto;background:#1e293b;border-radius:8px;padding:24px;">
        <h2 style="color:#f43f5e;">⚠ Security Alert — {severity}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td><b>Alert Type</b></td><td>{alert_type}</td></tr>
          <tr><td><b>Severity</b></td><td style="color:#f43f5e;">{severity}</td></tr>
          {ip_row}
          <tr><td><b>Description</b></td><td>{description}</td></tr>
        </table>
        <p style="color:#64748b;font-size:12px;margin-top:16px;">
          Log Security Monitoring System — automated alert
        </p>
      </div>
    </body></html>
    """


def send_alert_email(
    recipient: str,
    alert_type: str,
    severity: str,
    description: str,
    source_ip: Optional[str] = None,
) -> bool:
    """
    Send a security-alert email to *recipient*.

    Returns True on success, False if email is not configured or sending fails.
    """
    # Bail out early if SMTP is not configured
    if not all([settings.EMAIL_HOST, settings.EMAIL_USER, settings.EMAIL_PASSWORD]):
        logger.warning("Email not configured — skipping alert email.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[SECURITY ALERT] {severity} — {alert_type}"
        msg["From"] = settings.EMAIL_FROM or settings.EMAIL_USER
        msg["To"] = recipient

        html_body = _build_alert_html(alert_type, severity, description, source_ip)
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(msg["From"], [recipient], msg.as_string())

        logger.info("Alert email sent to %s for %s (%s)", recipient, alert_type, severity)
        return True

    except Exception as exc:
        logger.error("Failed to send alert email: %s", exc)
        return False
