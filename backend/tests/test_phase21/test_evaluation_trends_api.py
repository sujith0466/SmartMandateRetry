"""Phase 21: Evaluation Trends and Drift API Tests."""

from datetime import datetime, timezone
import uuid
import pytest
from flask.testing import FlaskClient

from app.domain.models import EvaluationRun, Merchant
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def trends_merchant(uow: UnitOfWork) -> str:
    uid = uuid.uuid4().hex[:6]
    merch_id = f"m_tr_{uid}"
    with uow:
        m = Merchant(id=merch_id, name=f"Trends Merchant {uid}", razorpay_account_id=f"acc_tr_{uid}")
        uow.merchants.add(m)
        uow.commit()
    return merch_id


class TestEvaluationTrendsAPI:
    def test_evaluation_trends_empty_state(self, client: FlaskClient, trends_merchant: str):
        """Test trends endpoint with no runs returns INSUFFICIENT_DATA or STABLE."""
        resp = client.get("/api/v1/evaluation/trends", headers={"X-Merchant-ID": trends_merchant})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] in ("INSUFFICIENT_DATA", "STABLE")

    def test_evaluation_trends_populated(self, client: FlaskClient, trends_merchant: str, uow: UnitOfWork):
        """Test trends endpoint when evaluation runs exist in DB."""
        uid = uuid.uuid4().hex[:6]
        with uow:
            run1 = EvaluationRun(
                id=f"run_tr_{uid}_1",
                dataset_name="eval_dataset_42_5000",
                baseline_mode="SMART_MANDATE",
                metrics_summary={
                    "macro_metrics": {
                        "label_accuracy": 0.98,
                        "macro_f1": 0.97,
                        "eligible_recovery_rate": 0.46,
                        "recovery_rate_uplift_pp": 17.06,
                        "zero_tolerance_violations": 0,
                    }
                },
                created_at=datetime.now(timezone.utc),
            )
            run2 = EvaluationRun(
                id=f"run_tr_{uid}_2",
                dataset_name="eval_dataset_42_5000",
                baseline_mode="SMART_MANDATE",
                metrics_summary={
                    "macro_metrics": {
                        "label_accuracy": 0.99,
                        "macro_f1": 0.98,
                        "eligible_recovery_rate": 0.46,
                        "recovery_rate_uplift_pp": 17.06,
                        "zero_tolerance_violations": 0,
                    }
                },
                created_at=datetime.now(timezone.utc),
            )
            uow.evaluations.add(run1)
            uow.evaluations.add(run2)
            uow.commit()

        resp = client.get("/api/v1/evaluation/trends", headers={"X-Merchant-ID": trends_merchant})
        assert resp.status_code == 200
        data = resp.get_json()

        assert data["status"] in ("STABLE", "DRIFT_DETECTED")
        assert data["total_runs"] >= 2
        assert len(data["trends"]) >= 2
        assert "accuracy" in data["trends"][0]
        assert "recovery_rate" in data["trends"][0]
