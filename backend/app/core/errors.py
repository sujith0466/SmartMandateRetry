"""Global error hierarchy and exception handlers for Flask."""

from typing import Any, Dict, Optional
from flask import Flask, jsonify, request


class AppError(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_SERVER_ERROR",
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class SignatureVerificationError(AppError):
    """Raised when an inbound webhook signature fails HMAC-SHA256 check."""

    def __init__(self, message: str = "Invalid webhook signature") -> None:
        super().__init__(message=message, status_code=400, error_code="INVALID_SIGNATURE")


class PolicyViolationError(AppError):
    """Raised when an action violates merchant policy constraints."""

    def __init__(self, reason: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            message=f"Action blocked by policy: {reason}",
            status_code=422,
            error_code="POLICY_VIOLATION",
            details=details
        )


class ResourceNotFoundError(AppError):
    """Raised when a requested entity does not exist."""

    def __init__(self, resource: str, identifier: str) -> None:
        super().__init__(
            message=f"{resource} '{identifier}' not found",
            status_code=404,
            error_code="NOT_FOUND"
        )


# Alias for domain/service layer
EntityNotFoundError = ResourceNotFoundError


class OptimisticLockError(AppError):
    """Raised when a concurrent state update violates optimistic concurrency control (OCC)."""

    def __init__(self, message: str = "Concurrent update conflict detected") -> None:
        super().__init__(
            message=message,
            status_code=409,
            error_code="OPTIMISTIC_LOCK_CONFLICT"
        )


class IdempotencyConflictError(AppError):
    """Raised when an operation conflicts with an existing idempotent record."""

    def __init__(self, message: str = "Idempotency key collision detected") -> None:
        super().__init__(
            message=message,
            status_code=409,
            error_code="IDEMPOTENCY_CONFLICT"
        )


def register_error_handlers(app: Flask) -> None:
    """Attach global error handlers to the Flask application."""

    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        response = {
            "error": {
                "code": error.error_code,
                "message": error.message,
                "details": error.details,
                "path": request.path
            }
        }
        return jsonify(response), error.status_code

    @app.errorhandler(404)
    def handle_404(error):
        return jsonify({
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested endpoint or resource was not found",
                "path": request.path
            }
        }), 404

    @app.errorhandler(500)
    def handle_500(error):
        return jsonify({
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred",
                "path": request.path
            }
        }), 500
