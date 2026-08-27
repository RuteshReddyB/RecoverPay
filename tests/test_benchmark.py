from backend.evaluation.benchmark import benchmark_evaluator
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_batch_benchmark_evaluator():
    report = benchmark_evaluator.run_batch_benchmark(num_events=100)
    assert report["summary"]["events_evaluated"] == 100
    assert "financial_metrics" in report
    assert "revenueguard_ai" in report["financial_metrics"]
    assert report["financial_metrics"]["revenueguard_ai"]["recovered_rupees"] >= 0
    assert "operational_metrics" in report
    assert "revenue_funnel" in report

def test_analytics_api_endpoints():
    # 1. Benchmark Report Endpoint
    res = client.get("/api/analytics/benchmark")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "report" in data

    # 2. Revenue Funnel Endpoint
    funnel_res = client.get("/api/analytics/funnel")
    assert funnel_res.status_code == 200
    assert funnel_res.json()["status"] == "success"
    assert "revenue_at_risk_rupees" in funnel_res.json()["funnel"]

    # 3. Overview KPIs Endpoint
    kpi_res = client.get("/api/analytics/overview")
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()["kpis"]
    assert "revenue_at_risk_rupees" in kpis
    assert "recovery_rate_pct" in kpis
