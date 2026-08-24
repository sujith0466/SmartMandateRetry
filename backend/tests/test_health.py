"""Tests for health and liveness probe endpoints."""

def test_healthz_endpoint(client):
    """Verify /api/v1/healthz returns healthy status."""
    response = client.get("/api/v1/healthz")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["app"] == "SmartMandateRetry"
    assert data["version"] == "1.0.0"


def test_policies_endpoint(client):
    """Verify /api/v1/policies returns policy configuration."""
    response = client.get("/api/v1/policies")
    assert response.status_code == 200
    data = response.get_json()
    assert "max_retries_per_case" in data
    assert "min_retry_interval_hours" in data
    assert data["hard_decline_auto_stop"] is True


def test_cases_list_stub(client):
    """Verify /api/v1/cases returns empty data list stub."""
    response = client.get("/api/v1/cases")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data["data"], list)
    assert data["pagination"]["page"] == 1
