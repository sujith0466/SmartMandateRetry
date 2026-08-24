"""Health and readiness probe endpoints."""

from flask import Blueprint, jsonify
from app.core.config import get_settings
from app.infrastructure.database import engine
from app.infrastructure.redis import get_redis

health_bp = Blueprint("health", __name__)


@health_bp.route("/healthz", methods=["GET"])
def liveness():
    """Liveness probe returning HTTP 200."""
    settings = get_settings()
    return jsonify({
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "version": "1.0.0"
    }), 200


@health_bp.route("/readyz", methods=["GET"])
def readiness():
    """Readiness probe checking PostgreSQL and Redis connectivity."""
    checks = {
        "database": "unknown",
        "redis": "unknown"
    }
    all_healthy = True

    # Database connectivity check
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        checks["database"] = "connected"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        all_healthy = False

    # Redis connectivity check
    try:
        r = get_redis()
        r.ping()
        checks["redis"] = "connected"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"
        all_healthy = False

    status_code = 200 if all_healthy else 503
    return jsonify({
        "status": "ready" if all_healthy else "not_ready",
        "checks": checks
    }), status_code
