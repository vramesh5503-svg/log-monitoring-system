"""
Centralised logging configuration.
Import `get_logger` wherever structured logging is needed.
"""

import logging
import sys
from app.utils.config import settings


def setup_logging() -> None:
    """
    Configure root logger.  Call once at application startup (in main.py).
    - DEBUG level in dev, INFO in production.
    - Timestamps + module names in every log line.
    """
    level = logging.DEBUG if settings.DEBUG else logging.INFO

    fmt = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(fmt)

    root = logging.getLogger()
    root.setLevel(level)
    # Avoid duplicate handlers when uvicorn reloads the module
    if not root.handlers:
        root.addHandler(handler)

    # Quieten noisy third-party libraries
    logging.getLogger("watchdog").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger.  Call at module level: ``logger = get_logger(__name__)``"""
    return logging.getLogger(name)
