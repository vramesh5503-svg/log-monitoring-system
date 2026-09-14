"""
Database configuration and session management.
Uses SQLite by default; swap DATABASE_URL in config for PostgreSQL.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.utils.config import settings

# Create engine — normalize postgres:// to postgresql:// for Render PostgreSQL compatibility
database_url = settings.DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in database_url else {}

engine = create_engine(
    database_url,
    connect_args=connect_args,
    echo=False,          # Set True to log all SQL statements during development
)

# Each request gets its own session; auto-closed after use
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class all ORM models will inherit from
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a DB session per request,
    then closes it automatically via the finally block.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Create all tables defined on Base.metadata.
    Called once at application startup.
    """
    # Import models here so their table definitions are registered before create_all
    from app.models import user, log, alert  # noqa: F401
    Base.metadata.create_all(bind=engine)
