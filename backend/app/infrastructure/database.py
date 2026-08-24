"""Database engine and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from app.core.config import get_settings
from app.domain.models import Base

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.APP_DEBUG
)

SessionLocal = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
)


def get_db():
    """Context manager / dependency for DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables (used in dev/test setups)."""
    Base.metadata.create_all(bind=engine)
