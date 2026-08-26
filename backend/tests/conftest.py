"""Pytest configuration and shared fixtures."""

import os
from typing import Generator
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Set testing environment prior to app creation
os.environ["APP_ENV"] = "testing"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/smartmandate_db"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"

from app.core.config import get_settings
from app.domain.models import Base
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.main import create_app

test_engine = create_engine(
    os.environ["DATABASE_URL"],
    pool_pre_ping=True
)

TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database schema is created before running test suite."""
    Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a transactional database session rolled back after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    try:
        session.close()
        if transaction.is_active:
            transaction.rollback()
    except Exception:
        pass
    finally:
        connection.close()


@pytest.fixture
def uow(db_session: Session) -> UnitOfWork:
    """Provide a UnitOfWork instance bound to the test transactional session."""
    return UnitOfWork(session_factory=lambda: db_session)


@pytest.fixture
def app(db_session: Session) -> Flask:
    """Return configured test application instance."""
    app = create_app()
    app.config.update({
        "TESTING": True,
        "DEBUG": False,
        "UOW_FACTORY": lambda: UnitOfWork(session_factory=lambda: db_session),
    })
    return app


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Return test client."""
    return app.test_client()
