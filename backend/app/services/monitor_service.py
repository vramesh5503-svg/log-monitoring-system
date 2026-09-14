"""
Real-time log file monitoring service using Watchdog.

Architecture:
  - MonitorService runs a Watchdog Observer in a background thread.
  - When a watched file is modified, LogFileHandler tails the new bytes
    and passes each new line through DetectionEngine.
  - A single global instance (monitor) is shared across the FastAPI app
    via app.state.monitor.
"""

import os
import threading
import logging
from typing import Optional

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent

from app.database.database import SessionLocal
from app.detector.engine import DetectionEngine
from app.utils.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# File-tail handler
# ─────────────────────────────────────────────────────────────────────────────

class LogFileHandler(FileSystemEventHandler):
    """
    Watchdog event handler that tails a single log file.

    Keeps an internal byte offset so only newly appended content is read
    on each modification event (like `tail -f`).
    """

    def __init__(self, filepath: str, websocket_manager=None):
        super().__init__()
        self.filepath          = os.path.abspath(filepath)
        self.websocket_manager = websocket_manager
        self._offset           = 0
        self._lock             = threading.Lock()

        # Seek to end on first attach so we don't reprocess historical lines
        if os.path.exists(self.filepath):
            self._offset = os.path.getsize(self.filepath)
            logger.info("Monitoring started on %s (offset=%d)", self.filepath, self._offset)

    def on_modified(self, event: FileModifiedEvent):
        """Called by Watchdog when any file in the watched directory changes."""
        # Filter to only our target file
        if os.path.abspath(event.src_path) != self.filepath:
            return

        with self._lock:
            try:
                self._tail_new_lines()
            except Exception as exc:
                logger.error("Error tailing %s: %s", self.filepath, exc)

    def _tail_new_lines(self):
        """Read and process bytes appended since last event."""
        current_size = os.path.getsize(self.filepath)

        # Handle log rotation (file shrunk)
        if current_size < self._offset:
            logger.warning("Log rotation detected for %s — resetting offset.", self.filepath)
            self._offset = 0

        if current_size == self._offset:
            return  # nothing new

        with open(self.filepath, "r", encoding="utf-8", errors="replace") as fh:
            fh.seek(self._offset)
            new_content = fh.read(current_size - self._offset)
            self._offset = fh.tell()

        # Each line triggers the detection engine in its own DB session
        db = SessionLocal()
        try:
            engine = DetectionEngine(db, websocket_manager=self.websocket_manager)
            for line in new_content.splitlines():
                engine.process_line(line, source_name=self.filepath)
        finally:
            db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Monitor service
# ─────────────────────────────────────────────────────────────────────────────

class MonitorService:
    """
    Manages the Watchdog Observer lifecycle.

    Usage::

        monitor = MonitorService()
        monitor.start("/var/log/auth.log")
        # ... application runs ...
        monitor.stop()
    """

    def __init__(self):
        self._observer:  Optional[Observer]      = None
        self._handler:   Optional[LogFileHandler] = None
        self._watch_path: Optional[str]           = None
        self.is_running:  bool                    = False
        self._lock = threading.Lock()
        self.websocket_manager = None  # injected from main.py after WS setup

    # ── Public API ─────────────────────────────────────────────────────────────

    def start(self, filepath: str) -> dict:
        """
        Begin monitoring *filepath*.

        If a monitor is already running on a different path, it is stopped first.

        Returns:
            Status dict with is_running and watch_path.
        """
        with self._lock:
            if self.is_running:
                if self._watch_path == os.path.abspath(filepath):
                    logger.info("Already monitoring %s", filepath)
                    return self._status()
                # Switch to new path
                self._stop_observer()

            filepath = os.path.abspath(filepath)

            if not os.path.exists(filepath):
                raise FileNotFoundError(f"Log file not found: {filepath}")

            watch_dir = os.path.dirname(filepath)

            self._handler  = LogFileHandler(filepath, self.websocket_manager)
            self._observer = Observer()
            self._observer.schedule(self._handler, path=watch_dir, recursive=False)
            self._observer.start()

            self._watch_path = filepath
            self.is_running  = True
            logger.info("Watchdog observer started on directory: %s", watch_dir)

        return self._status()

    def stop(self) -> dict:
        """Stop the active Watchdog observer."""
        with self._lock:
            self._stop_observer()
        return self._status()

    def get_status(self) -> dict:
        return self._status()

    # ── Private helpers ────────────────────────────────────────────────────────

    def _stop_observer(self):
        if self._observer and self._observer.is_alive():
            self._observer.stop()
            self._observer.join(timeout=5)
            logger.info("Watchdog observer stopped.")
        self._observer   = None
        self._handler    = None
        self._watch_path = None
        self.is_running  = False

    def _status(self) -> dict:
        return {
            "is_running": self.is_running,
            "watch_path": self._watch_path,
            "message":    "Monitoring active." if self.is_running else "Monitoring stopped.",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Global singleton — imported by main.py and the monitoring API router
# ─────────────────────────────────────────────────────────────────────────────

monitor_service = MonitorService()
