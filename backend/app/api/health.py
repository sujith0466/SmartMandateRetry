"""Health, readiness, metrics, and diagnostic observability endpoints."""

from flask import Blueprint, jsonify
from app.core.config import get_settings
from app.core.metrics import metrics
from app.infrastructure.database import engine
from app.infrastructure.redis import get_redis
from app.services.observability_service import ObservabilityService

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
    """Readiness probe checking PostgreSQL, Redis, and OpenRouter readiness."""
    settings = get_settings()
    checks = {
        "database": "unknown",
        "redis": "unknown",
        "llm_provider": "unknown",
    }
    all_healthy = True

    # 1. Database connectivity check
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        checks["database"] = "connected"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        all_healthy = False

    # 2. Redis connectivity check
    try:
        r = get_redis()
        r.ping()
        checks["redis"] = "connected"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"
        all_healthy = False

    # 3. LLM Provider configuration check (zero credentials leaked)
    if settings.LLM_PROVIDER in ("openrouter", "mock"):
        checks["llm_provider"] = f"configured ({settings.LLM_PROVIDER})"
    else:
        checks["llm_provider"] = f"unrecognized provider: {settings.LLM_PROVIDER}"
        all_healthy = False

    status_code = 200 if all_healthy else 503
    return jsonify({
        "status": "ready" if all_healthy else "not_ready",
        "checks": checks
    }), status_code


@health_bp.route("/metrics", methods=["GET"])
def get_metrics_snapshot():
    """Export current in-memory metrics snapshot for monitoring."""
    return jsonify(metrics.get_snapshot()), 200


@health_bp.route("/observability/summary", methods=["GET"])
def get_observability_summary():
    """Operational KPI metrics and lifecycle summary."""
    service = ObservabilityService()
    return jsonify(service.get_operational_summary()), 200
