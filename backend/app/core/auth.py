"""Merchant authentication and tenant-isolation decorators."""

from functools import wraps
from typing import Callable, Optional
from flask import current_app, g, jsonify, request

from app.core.logging import get_logger
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("core.auth")


def get_uow() -> UnitOfWork:
    """Obtain UnitOfWork instance from current_app config if in testing, else default session."""
    if current_app and current_app.config.get("UOW_FACTORY"):
        return current_app.config["UOW_FACTORY"]()
    return UnitOfWork(get_session)


def get_authenticated_merchant_id() -> Optional[str]:
    """Retrieve current authenticated merchant ID from request context."""
    return getattr(g, "merchant_id", None)


def require_merchant_auth(f: Callable) -> Callable:
    """
    Decorator enforcing merchant authentication and binding merchant context.
    Validates X-Merchant-ID, X-API-Key, or Bearer Authorization token against database.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. Extract credentials from headers
        merchant_id = request.headers.get("X-Merchant-ID")
        api_key = request.headers.get("X-API-Key")
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            bearer_token = auth_header[7:].strip()
            if not merchant_id:
                merchant_id = bearer_token

        effective_identifier = merchant_id or api_key

        if not effective_identifier:
            logger.warning("Unauthorized access attempt: missing authentication headers", path=request.path)
            return jsonify({
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Missing merchant authentication header (X-Merchant-ID or X-API-Key)",
                    "path": request.path,
                }
            }), 401

        # 2. Validate merchant in database
        uow = get_uow()
        with uow:
            merchant = uow.merchants.get_by_id(effective_identifier)
            if not merchant:
                # Also check by razorpay_account_id if passed as identifier
                merchant = uow.merchants.find_by_razorpay_account(effective_identifier)

            if not merchant:
                logger.warning("Unauthorized access attempt: invalid merchant identifier", path=request.path)
                return jsonify({
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid merchant credentials",
                        "path": request.path,
                    }
                }), 401

            # 3. Bind merchant context
            g.merchant_id = merchant.id
            g.current_merchant = merchant

        return f(*args, **kwargs)

    return decorated_function
