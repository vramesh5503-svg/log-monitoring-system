"""
Report and export routes.

GET /report          — JSON summary for the given period
GET /export/csv      — CSV file download
GET /export/json     — JSON file download
GET /export/pdf      — PDF file download
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import io

from app.database.database import get_db
from app.services.auth_service import get_current_active_user
from app.services.report_service import (
    generate_report, export_csv, export_json, export_pdf,
)
from app.models.user import User

router = APIRouter(prefix="", tags=["Reports"])

# Shared period query param
_period_query = Query("daily", pattern="^(daily|weekly|monthly)$",
                      description="Report period: daily | weekly | monthly")


@router.get("/report")
def get_report(
    period: str = _period_query,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """
    Return a JSON summary report for the given period.
    Includes totals, severity breakdown, top IPs, and top event types.
    """
    return generate_report(db, period)


@router.get("/export/csv")
def download_csv(
    period: str = _period_query,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Download all log entries for the period as a CSV file."""
    csv_content = export_csv(db, period)
    filename = f"logs_{period}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/json")
def download_json(
    period: str = _period_query,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Download all log entries for the period as a JSON file."""
    json_content = export_json(db, period)
    filename = f"logs_{period}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/pdf")
def download_pdf(
    period: str = _period_query,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Download a PDF report for the given period."""
    pdf_bytes = export_pdf(db, period)
    filename = f"report_{period}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
