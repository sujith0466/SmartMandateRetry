"""Database engine and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, scoped_session, sessionmaker
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


def get_session() -> Session:
    """Return a new database session."""
    return SessionLocal()


def get_db():
    """Context manager / generator dependency for DB session."""
    db = get_session()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables directly via metadata (used in quick dev/test setups)."""
    Base.metadata.create_all(bind=engine)
