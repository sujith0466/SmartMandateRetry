"""Pytest configuration and shared fixtures."""

import os
import pytest
from flask import Flask
from flask.testing import FlaskClient

# Set testing environment prior to app creation
os.environ["APP_ENV"] = "testing"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/smartmandate_test_db"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"

from app.main import create_app
from app.core.config import get_settings


@pytest.fixture
def app() -> Flask:
    """Return configured test application instance."""
    app = create_app()
    app.config.update({
        "TESTING": True,
        "DEBUG": False
    })
    return app


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Return test client."""
    return app.test_client()
