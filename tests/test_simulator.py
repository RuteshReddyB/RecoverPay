from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_simulator_bank_timeout():
    response = client.post("/api/simulator/trigger", json={"event_type": "bank_timeout"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["event_type"] == "bank_timeout"
    assert "agent_result" in data
    assert data["agent_result"]["recommended_action"] == "RETRY"
    assert data["agent_result"]["policy_status"] == "APPROVED"

def test_simulator_card_expired():
    response = client.post("/api/simulator/trigger", json={"event_type": "card_expired"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["event_type"] == "card_expired"
    assert "agent_result" in data
    assert data["agent_result"]["recommended_action"] == "PAYMENT_LINK"
    assert data["agent_result"]["policy_status"] == "APPROVED"

def test_simulator_high_value():
    response = client.post("/api/simulator/trigger", json={"event_type": "high_value"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["event_type"] == "high_value"
    assert "agent_result" in data
    # High value > 10,000 policy ceiling -> HUMAN_ESCALATION
    assert data["agent_result"]["policy_status"] == "HUMAN_ESCALATION"

def test_simulator_duplicate_webhook():
    response = client.post("/api/simulator/trigger", json={"event_type": "duplicate_webhook"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["event_type"] == "duplicate_webhook"
    assert data["idempotency_verified"] is True
    assert "agent_result" in data
