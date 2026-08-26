"""Application Factory for SmartMandateRetry Flask Service."""

from flask import Flask, g, request
from flask_cors import CORS

from app.api.health import health_bp
from app.api.v1.analytics import analytics_bp
from app.api.v1.audit import audit_bp
from app.api.v1.cases import cases_bp
from app.api.v1.policies import policies_bp
from app.api.v1.webhooks import webhooks_bp
from app.api.v1.evaluation import evaluation_bp
from app.core.config import get_settings
from app.core.correlation import generate_correlation_id, set_correlation_id
from app.core.errors import register_error_handlers
from app.core.logging import setup_logging


def create_app() -> Flask:
    """Create, configure, and assemble Flask application."""
    settings = get_settings()
    setup_logging(debug=settings.APP_DEBUG)

    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.APP_SECRET_KEY
    app.config["DEBUG"] = settings.APP_DEBUG

    # Enable CORS for frontend communication
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Correlation ID Request Hooks
    @app.before_request
    def bind_correlation_id():
        inbound_cid = request.headers.get("X-Correlation-ID")
        correlation_id = inbound_cid if (inbound_cid and len(inbound_cid) <= 64) else generate_correlation_id()
        set_correlation_id(correlation_id)
        g.correlation_id = correlation_id

    @app.after_request
    def attach_correlation_header(response):
        cid = getattr(g, "correlation_id", None)
        if cid:
            response.headers["X-Correlation-ID"] = cid
        return response

    # Register error handlers
    register_error_handlers(app)

    # Register API Blueprints
    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(cases_bp, url_prefix="/api/v1/cases")
    app.register_blueprint(policies_bp, url_prefix="/api/v1/policies")
    app.register_blueprint(webhooks_bp, url_prefix="/api/v1/webhooks")
    app.register_blueprint(analytics_bp, url_prefix="/api/v1/analytics")
    app.register_blueprint(audit_bp, url_prefix="/api/v1/audit-events")
    app.register_blueprint(evaluation_bp, url_prefix="/api/v1/evaluation")

    return app


if __name__ == "__main__":
    settings = get_settings()
    app = create_app()
    app.run(host="0.0.0.0", port=settings.PORT, debug=settings.APP_DEBUG)
