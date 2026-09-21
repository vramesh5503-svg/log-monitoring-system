"""
Log Security Monitoring System — FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app instance with metadata
  - Register CORS middleware
  - Register request-timing middleware
  - Mount all API routers under /api/v1
  - Initialize the database on startup
  - Seed a default admin user on first run
  - Expose a health-check endpoint
"""

import os
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.utils.config import settings
from app.utils.logger import setup_logging
from app.database.database import init_db, SessionLocal
from app.api import api_router

# Configure logging before anything else
setup_logging()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Startup / shutdown lifespan
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    AsyncContextManager used as FastAPI lifespan handler.
    Everything before `yield` runs at startup; after yield runs at shutdown.
    """
    logger.info("===============================================")
    logger.info("  %s  v%s  starting up...", settings.APP_NAME, settings.APP_VERSION)
    logger.info("===============================================")

    # 1. Create all DB tables
    init_db()
    logger.info("Database initialised.")

    # 2. Ensure the uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # 3. Seed a default admin user if none exists
    _seed_admin()

    yield  # ← application runs here

    # Shutdown
    from app.services.monitor_service import monitor_service
    if monitor_service.is_running:
        monitor_service.stop()
        logger.info("Watchdog observer stopped on shutdown.")

    logger.info("%s shut down cleanly.", settings.APP_NAME)


def _seed_admin() -> None:
    """
    Create or update default accounts on startup so the system is immediately usable.
    Credentials are taken from environment variables (or fall back to safe defaults).
    """
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@12345")
    admin_email    = os.getenv("ADMIN_EMAIL",    "admin@logsecurity.com")

    db = SessionLocal()
    try:
        from app.models.user import User, UserRole
        from app.services.auth_service import hash_password

        # 1. Default admin
        admin = db.query(User).filter(User.username == admin_username).first()
        if not admin:
            admin = User(
                username  = admin_username,
                email     = admin_email,
                password  = hash_password(admin_password),
                role      = UserRole.admin,
                is_active = True,
            )
            db.add(admin)
            logger.info("Default admin user created -> username: '%s'", admin_username)
        else:
            admin.password = hash_password(admin_password)
            admin.is_active = True
            admin.role = UserRole.admin

        # 2. security_admin
        sec_admin = db.query(User).filter(User.username == "security_admin").first()
        if not sec_admin:
            sec_admin = User(
                username  = "security_admin",
                email     = "security@logsecurity.com",
                password  = hash_password("Admin@2026!"),
                role      = UserRole.admin,
                is_active = True,
            )
            db.add(sec_admin)
            logger.info("Default security_admin user created -> username: 'security_admin'")
        else:
            sec_admin.password = hash_password("Admin@2026!")
            sec_admin.is_active = True
            sec_admin.role = UserRole.admin

        # 3. ramesh
        ramesh_user = db.query(User).filter(User.username == "ramesh").first()
        if not ramesh_user:
            ramesh_user = User(
                username  = "ramesh",
                email     = "ramesh@logsecurity.com",
                password  = hash_password("Ramesh@2007"),
                role      = UserRole.admin,
                is_active = True,
            )
            db.add(ramesh_user)
            logger.info("Default ramesh user created -> username: 'ramesh'")
        else:
            ramesh_user.password = hash_password("Ramesh@2007")
            ramesh_user.is_active = True
            ramesh_user.role = UserRole.admin

        db.commit()
    except Exception as exc:
        logger.error("Failed to seed admin user: %s", exc)
        db.rollback()
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI application
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.APP_VERSION,
    description = (
        "Real-time log file monitoring system with security threat detection, "
        "JWT authentication, and a WebSocket-powered dashboard."
    ),
    docs_url    = "/docs",
    redoc_url   = "/redoc",
    lifespan    = lifespan,
)


# ─────────────────────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────────────────────

# CORS — allow localhost, Vercel preview/production URLs, and all client origins
frontend_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://172.16.68.85:5173",
]
if settings.FRONTEND_URL:
    for origin in settings.FRONTEND_URL.split(","):
        cleaned = origin.strip().rstrip("/")
        if cleaned and cleaned not in frontend_origins:
            frontend_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = frontend_origins,
    allow_origin_regex = r"^https?://.*$",  # Allow all web & preview origins safely
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# GZip — compress responses larger than 1 KB
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    Adds X-Process-Time header to every response so the frontend
    can display API latency in the dev tools.
    """
    start = time.perf_counter()
    response = await call_next(request)
    elapsed  = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{elapsed:.4f}s"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every incoming request with method, path, and response status."""
    response = await call_next(request)
    logger.debug(
        "%s %s -> %s",
        request.method,
        request.url.path,
        response.status_code,
    )
    return response


# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────

# REST endpoints mounted at both /api/v1/… and root /… to tolerate any base URL config
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router)

# WebSocket endpoint mounted directly at /ws and /api/v1/ws
from app.api.monitoring import websocket_endpoint
app.websocket("/ws")(websocket_endpoint)
app.websocket("/api/v1/ws")(websocket_endpoint)


# ─────────────────────────────────────────────────────────────────────────────
# Static file serving (uploaded log files — read by admin only in production)
# ─────────────────────────────────────────────────────────────────────────────

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
if os.path.isdir(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ─────────────────────────────────────────────────────────────────────────────
# Health check & root
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    """Root endpoint — quick sanity check."""
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status":  "running",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """
    Health-check endpoint for load balancers / container orchestrators.
    Returns 200 when the database is reachable.
    """
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status":   "healthy" if db_status == "ok" else "degraded",
        "database": db_status,
        "monitoring": {
            "is_running": __import__("app.services.monitor_service", fromlist=["monitor_service"])
                          .monitor_service.is_running,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Global exception handler (returns JSON instead of HTML 500 pages)
# ─────────────────────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )
