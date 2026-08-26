"""Tests for health and liveness probe endpoints."""

from app.domain.models import Merchant
from app.infrastructure.repositories.unit_of_work import UnitOfWork


def test_healthz_endpoint(client):
    """Verify /api/v1/healthz returns healthy status."""
    response = client.get("/api/v1/healthz")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["app"] == "SmartMandateRetry"
    assert data["version"] == "1.0.0"


def test_policies_endpoint(client, uow: UnitOfWork):
    """Verify /api/v1/policies returns policy configuration."""
    with uow:
        m = Merchant(id="m_health_test", name="Health Merchant", razorpay_account_id="acc_health_test")
        uow.merchants.add(m)
        uow.commit()

    response = client.get("/api/v1/policies", headers={"X-Merchant-ID": "m_health_test"})
    assert response.status_code == 200
    data = response.get_json()
    assert "max_retries_per_case" in data
    assert "min_retry_interval_hours" in data
    assert data["hard_decline_auto_stop"] is True


def test_cases_list_stub(client, uow: UnitOfWork):
    """Verify /api/v1/cases returns empty data list stub with auth."""
    with uow:
        m = Merchant(id="m_cases_test", name="Cases Merchant", razorpay_account_id="acc_cases_test")
        uow.merchants.add(m)
        uow.commit()

    response = client.get("/api/v1/cases", headers={"X-Merchant-ID": "m_cases_test"})
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data["data"], list)
    assert data["pagination"]["page"] == 1
