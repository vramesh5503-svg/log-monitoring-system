"""
Monitoring control and file-upload routes.

POST /monitor/start   — start watching a log file
POST /monitor/stop    — stop the current watcher
GET  /monitor/status  — current watcher state
POST /upload-log      — upload and immediately scan a log file
GET  /ws              — WebSocket endpoint for real-time alerts
"""

import os
import shutil
import logging
from datetime import datetime, timezone

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException,
    UploadFile, WebSocket, WebSocketDisconnect, status,
)
from sqlalchemy.orm import Session

from app.database.database import get_db, SessionLocal
from app.schemas.report import MonitorSettings, MonitorStatus
from app.schemas.common import MessageResponse
from app.services.auth_service import get_current_active_user, require_admin
from app.services.monitor_service import monitor_service
from app.services.websocket_manager import ws_manager
from app.detector.engine import DetectionEngine
from app.utils.config import settings
from app.utils.helpers import sanitize_filename
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Monitoring"])


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint — frontend connects here for real-time alert push.

    Messages sent to clients are JSON strings with shape:
      { "type": "new_alert", "log_id": ..., "severity": ..., ... }
    """
    await ws_manager.connect(websocket)
    try:
        # Keep connection alive; echo any pings from client
        while True:
            data = await websocket.receive_text()
            # Optionally handle ping/pong from client
            if data == "ping":
                await ws_manager.send_personal(websocket, '{"type":"pong"}')
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)


# ─────────────────────────────────────────────────────────────────────────────
# Monitor control
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/monitor/start", response_model=MonitorStatus)
def start_monitoring(
    payload: MonitorSettings,
    _: User = Depends(require_admin),
):
    """
    Start real-time monitoring on the specified *watch_path*.
    Requires Admin role.
    """
    watch_path = payload.watch_path or os.path.join(settings.UPLOAD_DIR, "watched.log")

    # Wire the live WebSocket manager into the service
    monitor_service.websocket_manager = ws_manager

    try:
        result = monitor_service.start(watch_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    return MonitorStatus(**result)


@router.post("/monitor/stop", response_model=MonitorStatus)
def stop_monitoring(_: User = Depends(require_admin)):
    """Stop the active file watcher. Requires Admin role."""
    result = monitor_service.stop()
    return MonitorStatus(**result)


@router.get("/monitor/status", response_model=MonitorStatus)
def monitor_status(_: User = Depends(get_current_active_user)):
    """Return current monitoring state (running / path)."""
    result = monitor_service.get_status()
    return MonitorStatus(**result)


# ─────────────────────────────────────────────────────────────────────────────
# Log file upload
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload-log", response_model=MessageResponse)
async def upload_log_file(
    file: UploadFile = File(..., description="Log file to analyse"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a log file and run all detection rules against every line.

    - Accepts text-based log files (syslog, auth.log, apache access.log, etc.).
    - Enforces MAX_UPLOAD_SIZE_MB limit.
    - Returns the number of lines processed.
    """
    # Size guard (read first chunk to check content-length header isn't spoofed)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # Validate extension
    allowed_extensions = {".log", ".txt", ".csv", ""}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .log, .txt, and .csv files are accepted.",
        )

    # Save to uploads/
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_name  = sanitize_filename(file.filename or "upload.log")
    ts_prefix  = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    save_path  = os.path.join(settings.UPLOAD_DIR, f"{ts_prefix}_{safe_name}")

    total_size = 0
    try:
        with open(save_path, "wb") as dest:
            while chunk := await file.read(65536):  # 64 KB chunks
                total_size += len(chunk)
                if total_size > max_bytes:
                    dest.close()
                    os.remove(save_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
                    )
                dest.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File save failed: {exc}",
        )

    # Run detection engine over every line in the file
    engine = DetectionEngine(db, websocket_manager=ws_manager)
    lines_processed = engine.process_file(save_path)

    logger.info(
        "User %s uploaded '%s' — %d lines processed.",
        current_user.username, safe_name, lines_processed,
    )

    return MessageResponse(
        message=f"File '{safe_name}' uploaded and scanned successfully.",
        detail={"lines_processed": lines_processed, "saved_as": save_path},
    )
