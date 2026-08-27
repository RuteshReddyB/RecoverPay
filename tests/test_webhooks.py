import json
import uuid
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

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
    assert data1["recommended_action"] == "RETRY"

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
