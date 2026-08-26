"""Unit and authentication tests for Merchant API."""

import pytest
from flask.testing import FlaskClient

from app.domain.models import Merchant
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def auth_merchant(uow: UnitOfWork) -> str:
    merchant_id = "m_auth_test_01"
    with uow:
        m = Merchant(id=merchant_id, name="Auth Test Merchant", razorpay_account_id="acc_auth_test_01")
        uow.merchants.add(m)
        uow.commit()
    return merchant_id


def test_missing_auth_header_returns_401(client: FlaskClient):
    resp = client.get("/api/v1/cases")
    assert resp.status_code == 401
    data = resp.get_json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_invalid_merchant_id_returns_401(client: FlaskClient):
    resp = client.get("/api/v1/cases", headers={"X-Merchant-ID": "m_non_existent"})
    assert resp.status_code == 401
    data = resp.get_json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_valid_merchant_id_header_returns_200(client: FlaskClient, auth_merchant: str):
    resp = client.get("/api/v1/cases", headers={"X-Merchant-ID": auth_merchant})
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    assert "pagination" in data


def test_valid_bearer_token_returns_200(client: FlaskClient, auth_merchant: str):
    resp = client.get("/api/v1/cases", headers={"Authorization": f"Bearer {auth_merchant}"})
    assert resp.status_code == 200


def test_correlation_id_echo_in_response(client: FlaskClient, auth_merchant: str):
    custom_cid = "corr_custom_test_header_123"
    resp = client.get(
        "/api/v1/cases",
        headers={
            "X-Merchant-ID": auth_merchant,
            "X-Correlation-ID": custom_cid
        }
    )
    assert resp.status_code == 200
    assert resp.headers.get("X-Correlation-ID") == custom_cid
