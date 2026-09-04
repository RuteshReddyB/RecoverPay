import json
import uuid
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

VALID_ACTIONS = {"RETRY", "PAYMENT_LINK", "REMINDER", "SCHEDULE_FOLLOWUP", "HUMAN_ESCALATION"}
VALID_EXEC_STATUSES = {
    "EXECUTED_PAYMENT_LINK", "EXECUTED_RETRY", "EXECUTED_REMINDER",
    "ESCALATED_TO_HUMAN", "BLOCKED_BY_POLICY", "EXECUTION_FAILED"
}

def test_webhook_ingestion_and_idempotency():
    evt_id = f"evt_test_{uuid.uuid4().hex[:8]}"
    payload = {
        "event_id": evt_id,
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_test_{uuid.uuid4().hex[:6]}",
                    "amount": 499900,
                    "customer_id": "c_webhook_test",
                    "error_reason": "bank_timeout",
                    "method": "card"
                }
            }
        }
    }

    # First delivery -> Processed
    res1 = client.post("/api/webhooks/razorpay", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "processed"
    assert data1["event_id"] == evt_id

    # Action must be a valid one (not hardcoded to RETRY — model picks best action)
    assert data1["recommended_action"] in VALID_ACTIONS

    # New fields: webhook now executes the action immediately
    assert "execution_status" in data1, "execution_status field missing from webhook response"
    assert "execution_result" in data1, "execution_result field missing from webhook response"
    assert data1["execution_status"] in VALID_EXEC_STATUSES

    # Duplicate delivery with same event_id -> Ignored by Idempotency Layer
    res2 = client.post("/api/webhooks/razorpay", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "ignored_duplicate"
    assert data2["event_id"] == evt_id

def test_recovery_evaluation_and_execution_endpoints():
    # 1. Evaluate
    eval_res = client.post("/api/recovery/evaluate", json={
        "payment_details": {
            "amount_paisa": 499900,
            "failure_reason": "card_expired"
        }
    })
    assert eval_res.status_code == 200
    assert eval_res.json()["decision"]["recommended_action"] == "PAYMENT_LINK"

def test_webhook_high_value_triggers_human_escalation():
    """Payment above Rs. 10,000 policy cap must be escalated — never auto-executed."""
    payload = {
        "event_id": f"evt_highval_{uuid.uuid4().hex[:8]}",
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_hv_{uuid.uuid4().hex[:6]}",
                    "amount": 2000000,  # Rs. 20,000 — above Rs. 10k autonomous cap
                    "customer_id": "c_vip_policy_test",
                    "error_reason": "bank_timeout",
                    "method": "netbanking"
                }
            }
        }
    }
    res = client.post("/api/webhooks/razorpay", json=payload)
    assert res.status_code == 200
    data = res.json()
    # Policy engine must block autonomous execution and escalate
    assert data["policy_status"] == "HUMAN_ESCALATION"
    assert data["execution_status"] == "ESCALATED_TO_HUMAN"

def test_webhook_execution_status_always_resolves():
    """execution_status must always be a terminal state — never stays as PENDING."""
    payload = {
        "event_id": f"evt_exec_{uuid.uuid4().hex[:8]}",
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_exec_{uuid.uuid4().hex[:6]}",
                    "amount": 299900,  # Rs. 2,999
                    "customer_id": "c_exec_test",
                    "error_reason": "card_expired",
                    "method": "card"
                }
            }
        }
    }
    res = client.post("/api/webhooks/razorpay", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "execution_status" in data
    assert "execution_result" in data
    assert data["execution_status"] != "PENDING", (
        f"execution_status should always resolve, got: {data['execution_status']}"
    )
    assert data["execution_status"] in VALID_EXEC_STATUSES
