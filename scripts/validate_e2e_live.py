"""Complete Live End-to-End System Validation for SmartMandateRetry (Phase 21 Baseline)."""

import json
import sys
import time
import urllib.error
import urllib.request

BASE_URL = "http://localhost:5000/api/v1"
MERCHANT_ID = "m_demo_merchant_01"
FRONTEND_URL = "http://localhost:3000"

results = {}


def req(path, method="GET", body=None, headers=None):
    if headers is None:
        headers = {"X-Merchant-ID": MERCHANT_ID}
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    else:
        data = None
    url = f"{BASE_URL}{path}"
    req_obj = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req_obj) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {}


def run_e2e_validation():
    print("================================================================")
    print("STARTING SMARTMANDATERETRY LIVE END-TO-END SYSTEM VALIDATION")
    print(f"Target Backend:  {BASE_URL}")
    print(f"Target Frontend: {FRONTEND_URL}")
    print(f"Merchant ID:     {MERCHANT_ID}")
    print("================================================================\n")

    # 1. Health & System Readiness
    print("1. Health & System Readiness...")
    status, body = req("/healthz", headers={})
    assert status == 200 and body.get("status") == "healthy", f"Health failed: {status}, {body}"
    results["1. Healthz Check"] = "PASS (200 healthy)"

    status, body = req("/readyz", headers={})
    assert status == 200 and body.get("status") == "ready", f"Ready failed: {status}, {body}"
    results["2. Readyz Check"] = "PASS (200 ready, DB/Redis connected)"
    print("   -> Healthz and Readyz: OK (HTTP 200)")

    # 2. Authentication & Merchant Tenant Isolation
    print("\n2. Authentication & Merchant Tenant Isolation...")
    status, body = req("/cases", headers={})
    assert status == 401, f"Expected 401 for missing header, got {status}"
    status, body = req("/cases", headers={"X-Merchant-ID": "m_non_existent"})
    assert status == 401, f"Expected 401 for non-existent merchant, got {status}"
    status, body = req("/cases", headers={"X-Merchant-ID": MERCHANT_ID})
    assert status == 200 and "data" in body, f"Expected 200 for valid merchant, got {status}"
    results["3. Auth & Tenant Isolation"] = "PASS (401 on invalid/missing auth, 200 on valid tenant)"
    print("   -> Positive & Negative Auth Checks: OK")

    # 3. Analytics Dashboard
    print("\n3. Analytics Dashboard...")
    status, body = req("/analytics/overview")
    assert status == 200 and "total_cases_count" in body, f"Analytics summary failed: {status}"
    total_cases = body.get("total_cases_count", 0)
    recovered_amount = body.get("recovered_revenue_inr", 0)
    results["4. Analytics Dashboard"] = f"PASS (Total cases: {total_cases}, Recovered: INR {recovered_amount})"
    print(f"   -> Summary Metrics: OK (Total Cases: {total_cases}, Recovered: INR {recovered_amount})")

    # 4. Cases & Filtering
    print("\n4. Recovery Cases Listing & Pagination...")
    status, body = req("/cases?page=1&limit=10")
    assert status == 200 and len(body.get("data", [])) > 0, f"List cases failed: {status}"
    case_id = body["data"][0]["id"]
    results["5. Cases Listing"] = f"PASS (Found {len(body['data'])} cases, Case ID: {case_id})"
    print(f"   -> Cases List: OK (Found {len(body['data'])} cases, First ID: {case_id})")

    # 5. Case Detail, Actions, Reconciliation
    print("\n5. Case Detail, Action History, & Settlement Reconciliation...")
    status, case_detail = req(f"/cases/{case_id}")
    assert status == 200 and case_detail.get("case", {}).get("id") == case_id, f"Case detail failed: {status}, {case_detail}"
    status, actions = req(f"/cases/{case_id}/actions")
    assert status == 200 and "actions" in actions, f"Case actions failed: {status}"
    status, recon = req(f"/cases/{case_id}/reconciliation")
    assert status == 200 and "is_settled" in recon, f"Case reconciliation failed: {status}"
    results["6. Case Detail & Reconciliation"] = "PASS (Detail, actions, settlement reconciliation retrieved)"
    print("   -> Case Detail, Actions, Reconciliation: OK")

    # 6. Policy Configuration & What-If Studio (Phase 21)
    print("\n6. Policy Configuration & What-If Studio (Phase 21)...")
    status, policy = req("/policies")
    assert status == 200 and policy.get("max_retries_per_case") is not None, f"Get policy failed: {status}"

    sim_payload = {
        "max_retries_per_case": 4,
        "min_retry_interval_hours": 12,
        "max_recovery_window_days": 21,
        "min_confidence_threshold": 0.70,
        "high_value_threshold_inr": 15000.0,
        "max_customer_contacts_per_cycle": 4,
        "hard_decline_auto_stop": True,
        "split": "TEST",
    }
    t0 = time.perf_counter()
    status, sim_res = req("/policies/simulate", method="POST", body=sim_payload)
    t1 = time.perf_counter()
    sim_ms = (t1 - t0) * 1000
    assert status == 200 and sim_res.get("total_scenarios", 0) > 0, f"Simulation failed: {status}, {sim_res}"
    assert sim_res.get("policy_violations") == 0, "Zero tolerance violation in simulation!"
    results["7. What-If Policy Simulation (P21)"] = (
        f"PASS ({sim_ms:.2f}ms latency, {sim_res.get('total_scenarios')} scenarios evaluated, Uplift: +{sim_res.get('recovery_rate_uplift_pp')}pp, 0 violations)"
    )
    print(f"   -> Simulation Execution: OK ({sim_ms:.2f}ms latency, Uplift: +{sim_res.get('recovery_rate_uplift_pp')}pp, Violations: 0)")

    # Negative malformed payload test
    try:
        raw_req = urllib.request.Request(
            f"{BASE_URL}/policies/simulate",
            data=b"invalid-not-json",
            headers={"X-Merchant-ID": MERCHANT_ID, "Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(raw_req)
        assert False, "Expected HTTP 400 on malformed body"
    except urllib.error.HTTPError as e:
        assert e.code == 400, f"Expected 400, got {e.code}"
    results["8. Policy Simulation Validation Check"] = "PASS (400 Bad Request rejected malformed body)"
    print("   -> Negative Validation on Malformed Payload: OK (HTTP 400)")

    # 7. Audit Logs
    print("\n7. Audit Logs & Governance Trail...")
    status, audits = req("/audit-events?page=1&limit=10")
    assert status == 200 and "data" in audits, f"Audit events failed: {status}"
    results["9. Audit Trail"] = f"PASS ({len(audits.get('data', []))} audit events retrieved)"
    print(f"   -> Audit Events: OK (Retrieved {len(audits.get('data', []))} events)")

    # 8. Decision Explainability & Attribution (Phase 21)
    print("\n8. Decision Explainability & Factor Attribution (Phase 21)...")
    status, explain = req(f"/cases/{case_id}/explainability")
    assert status == 200 and len(explain.get("factor_weights", [])) == 4, f"Explainability failed: {status}"
    assert "governing_authority" in explain, "governing_authority missing"
    results["10. Decision Explainability (P21)"] = (
        f"PASS (Authority: {explain.get('governing_authority')}, Factors: {len(explain.get('factor_weights'))})"
    )
    print(f"   -> Factor Attribution: OK (Authority: {explain.get('governing_authority')}, 4 Feature Weights)")

    # 9. Evaluation Lab & Comparative Benchmark
    print("\n9. Evaluation Lab & Comparative Benchmark...")
    status, eval_sum = req("/evaluation/summary")
    assert status == 200 and eval_sum.get("dataset", {}).get("total_scenarios") == 5000, f"Eval summary failed: {status}"
    print("   -> Dataset Manifest: OK (5,000 synthetic scenarios)")

    print("   -> Executing 4-mode comparative benchmark on TEST split (802 scenarios)...")
    t0 = time.perf_counter()
    status, comp_bench = req("/evaluation/benchmark", method="POST", body={"split": "TEST", "compare": True, "persist": True})
    t1 = time.perf_counter()
    assert status == 200 and "mode_metrics" in comp_bench, f"Comparative benchmark failed: {status}"
    smart_m = comp_bench["mode_metrics"]["SMART_MANDATE"]
    assert smart_m["safety_metrics"]["total_policy_violations"] == 0, "Violations on SMART_MANDATE!"
    acc = smart_m["label_accuracy"] * 100
    uplift = smart_m.get("recovery_uplift_pp")
    rec_rate = smart_m.get("simulated_recovery_rate", 0) * 100
    results["11. Comparative Benchmark Runner"] = (
        f"PASS ({(t1-t0):.2f}s latency, SMART_MANDATE accuracy: {acc:.1f}%, Recovery Rate: {rec_rate:.1f}%, Uplift: {uplift}pp, 0 violations)"
    )
    print(f"   -> Benchmark Runner: OK ({(t1-t0):.2f}s, Accuracy: {acc:.1f}%, Recovery Rate: {rec_rate:.1f}%, Uplift: {uplift}pp, Violations: 0)")

    # 10. Longitudinal Trends & Model Drift (Phase 21)
    print("\n10. Longitudinal Trends & Model Drift Monitoring (Phase 21)...")
    status, trends = req("/evaluation/trends")
    assert status == 200 and trends.get("status") in ("STABLE", "DRIFT_DETECTED"), f"Trends failed: {status}"
    assert trends.get("total_runs", 0) >= 1, "Expected at least 1 persisted run"
    results["12. Longitudinal Trends (P21)"] = (
        f"PASS (Status: {trends.get('status')}, Tracked Runs: {trends.get('total_runs')})"
    )
    print(f"   -> Longitudinal Trends: OK (Status: {trends.get('status')}, Tracked Runs: {trends.get('total_runs')})")

    # 11. Frontend Application Shell Integrity
    print("\n11. Frontend Application Shell & Asset Integrity...")
    req_fe = urllib.request.Request(FRONTEND_URL)
    with urllib.request.urlopen(req_fe) as resp:
        fe_status = resp.status
        fe_html = resp.read().decode("utf-8")
        assert fe_status == 200 and '<div id="root"></div>' in fe_html, "Frontend root missing"
    results["13. Frontend UI Shell"] = "PASS (HTTP 200 OK, Single Page App mounted)"
    print("   -> Frontend Preview Server: OK (HTTP 200 OK text/html)")

    print("\n================================================================")
    print("END-TO-END VALIDATION SUMMARY: 100% OF AREAS PASSED")
    print("================================================================")
    for k, v in results.items():
        print(f"  {k:35}: {v}")
    print("================================================================")


if __name__ == "__main__":
    run_e2e_validation()
