"""
Report generation service.

Supports:
  - Daily / Weekly / Monthly summary dicts
  - CSV export (via csv module)
  - JSON export
  - PDF export (via ReportLab)
"""

import csv
import io
import json
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Literal

from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.models.log import LogEntry, SeverityLevel
from app.models.alert import Alert, AlertSeverity, AlertType

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Date range helpers
# ─────────────────────────────────────────────────────────────────────────────

def _date_range(period: str):
    """Return (start, end) datetimes for the given period."""
    now = datetime.now(timezone.utc)
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end   = now
    elif period == "weekly":
        start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end   = now
    elif period == "monthly":
        start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        end   = now
    else:
        raise ValueError(f"Unknown period: {period}")
    return start, end


# ─────────────────────────────────────────────────────────────────────────────
# Summary dict
# ─────────────────────────────────────────────────────────────────────────────

def generate_report(db: Session, period: str = "daily") -> dict:
    """
    Build a summary dict for the given *period*.
    Used by GET /report and as the base for all export formats.
    """
    start, end = _date_range(period)

    # Base query restricted to period
    log_q   = db.query(LogEntry).filter(LogEntry.timestamp >= start, LogEntry.timestamp <= end)
    alert_q = db.query(Alert).filter(Alert.created_at >= start, Alert.created_at <= end)

    total_logs   = log_q.count()
    total_alerts = alert_q.count()

    # Severity breakdown
    sev_rows = (
        log_q.with_entities(LogEntry.severity, func.count(LogEntry.id))
        .group_by(LogEntry.severity)
        .all()
    )
    sev_map = {row[0].value: row[1] for row in sev_rows}

    # Top event types
    top_events = (
        log_q.with_entities(LogEntry.event_type, func.count(LogEntry.id).label("cnt"))
        .filter(LogEntry.event_type.isnot(None))
        .group_by(LogEntry.event_type)
        .order_by(desc("cnt"))
        .limit(5)
        .all()
    )

    # Top source IPs
    top_ips = (
        log_q.with_entities(LogEntry.source_ip, func.count(LogEntry.id).label("cnt"))
        .filter(LogEntry.source_ip.isnot(None))
        .group_by(LogEntry.source_ip)
        .order_by(desc("cnt"))
        .limit(5)
        .all()
    )

    return {
        "period":          period,
        "start_date":      start.isoformat(),
        "end_date":        end.isoformat(),
        "generated_at":    datetime.now(timezone.utc).isoformat(),
        "total_logs":      total_logs,
        "total_alerts":    total_alerts,
        "critical_alerts": sev_map.get("CRITICAL", 0),
        "high_alerts":     sev_map.get("HIGH", 0),
        "medium_alerts":   sev_map.get("MEDIUM", 0),
        "low_alerts":      sev_map.get("LOW", 0),
        "top_event_types": [{"event_type": r[0], "count": r[1]} for r in top_events],
        "top_source_ips":  [{"source_ip": r[0], "count": r[1]} for r in top_ips],
    }


# ─────────────────────────────────────────────────────────────────────────────
# CSV export
# ─────────────────────────────────────────────────────────────────────────────

def export_csv(db: Session, period: str = "daily") -> str:
    """
    Return a CSV string of all log entries in the period.
    """
    start, end = _date_range(period)
    logs = (
        db.query(LogEntry)
        .filter(LogEntry.timestamp >= start, LogEntry.timestamp <= end)
        .order_by(LogEntry.timestamp)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "timestamp", "severity", "event_type", "source_ip", "source", "message"])
    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.isoformat() if log.timestamp else "",
            log.severity.value,
            log.event_type or "",
            log.source_ip or "",
            log.source or "",
            log.message,
        ])
    return output.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# JSON export
# ─────────────────────────────────────────────────────────────────────────────

def export_json(db: Session, period: str = "daily") -> str:
    """
    Return a JSON string of all log entries in the period.
    """
    start, end = _date_range(period)
    logs = (
        db.query(LogEntry)
        .filter(LogEntry.timestamp >= start, LogEntry.timestamp <= end)
        .order_by(LogEntry.timestamp)
        .all()
    )
    data = [
        {
            "id":         log.id,
            "timestamp":  log.timestamp.isoformat() if log.timestamp else None,
            "severity":   log.severity.value,
            "event_type": log.event_type,
            "source_ip":  log.source_ip,
            "source":     log.source,
            "message":    log.message,
        }
        for log in logs
    ]
    return json.dumps({"report": generate_report(db, period), "logs": data}, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# PDF export (ReportLab)
# ─────────────────────────────────────────────────────────────────────────────

def export_pdf(db: Session, period: str = "daily") -> bytes:
    """
    Generate a PDF report using ReportLab.
    Returns raw PDF bytes.
    Falls back to a plain-text placeholder if ReportLab is not installed.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        )

        summary = generate_report(db, period)

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                                 topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        story  = []

        # ── Title ─────────────────────────────────────────────────────────────
        title_style = ParagraphStyle("title", parent=styles["Heading1"],
                                      textColor=colors.HexColor("#f43f5e"),
                                      fontSize=18, spaceAfter=12)
        story.append(Paragraph("Log Security Monitoring — Report", title_style))
        story.append(Paragraph(
            f"Period: {summary['period'].capitalize()}  |  "
            f"Generated: {summary['generated_at'][:19]}",
            styles["Normal"],
        ))
        story.append(Spacer(1, 0.5*cm))

        # ── Summary table ─────────────────────────────────────────────────────
        summary_data = [
            ["Metric", "Value"],
            ["Total Logs",      str(summary["total_logs"])],
            ["Total Alerts",    str(summary["total_alerts"])],
            ["Critical Alerts", str(summary["critical_alerts"])],
            ["High Alerts",     str(summary["high_alerts"])],
            ["Medium Alerts",   str(summary["medium_alerts"])],
            ["Low Alerts",      str(summary["low_alerts"])],
        ]
        tbl = Table(summary_data, colWidths=[8*cm, 8*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1),
             [colors.HexColor("#0f172a"), colors.HexColor("#1e293b")]),
            ("TEXTCOLOR",   (0, 1), (-1, -1), colors.HexColor("#e2e8f0")),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),
            ("ALIGN",       (0, 0), (-1, -1), "LEFT"),
            ("PADDING",     (0, 0), (-1, -1), 8),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 0.5*cm))

        # ── Top event types ───────────────────────────────────────────────────
        story.append(Paragraph("Top Event Types", styles["Heading2"]))
        for evt in summary["top_event_types"]:
            story.append(Paragraph(f"• {evt['event_type']}: {evt['count']}", styles["Normal"]))
        story.append(Spacer(1, 0.3*cm))

        # ── Top source IPs ────────────────────────────────────────────────────
        story.append(Paragraph("Top Source IPs", styles["Heading2"]))
        for ip in summary["top_source_ips"]:
            story.append(Paragraph(f"• {ip['source_ip']}: {ip['count']}", styles["Normal"]))

        doc.build(story)
        return buf.getvalue()

    except ImportError:
        logger.warning("ReportLab not installed — returning plain-text PDF placeholder.")
        text = (
            f"Log Security Report\n"
            f"Period: {period}\n"
            f"Install 'reportlab' for proper PDF generation.\n"
        )
        return text.encode("utf-8")
