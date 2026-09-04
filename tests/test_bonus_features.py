import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_get_merchant_policy_api():
    response = client.get("/api/policy")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "policy" in data
    assert "max_auto_recovery_amount_paisa" in data["policy"]

def test_update_merchant_policy_api():
    payload = {
        "max_auto_recovery_amount_rupees": 15000.0,
        "max_retry_attempts": 3,
        "min_recovery_probability": 0.50,
        "max_contact_attempts": 2,
        "auto_recovery_enabled": True
    }
    response = client.put("/api/policy", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["policy"]["max_retry_attempts"] == 3
    assert data["policy"]["min_recovery_probability"] == 0.50

    # Restore default policy for test isolation
    default_payload = {
        "max_auto_recovery_amount_rupees": 10000.0,
        "max_retry_attempts": 2,
        "min_recovery_probability": 0.40,
        "max_contact_attempts": 2,
        "auto_recovery_enabled": True
    }
    client.put("/api/policy", json=default_payload)

def test_export_audit_logs_csv_api():
    response = client.get("/api/export/audit-logs/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "recoverpay_audit_trail.csv" in response.headers["content-disposition"]
    assert "Audit Log ID" in response.text

def test_export_benchmark_csv_api():
    response = client.get("/api/export/benchmark/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "recoverpay_benchmark_report.csv" in response.headers["content-disposition"]
    assert "RecoverPay AI" in response.text
