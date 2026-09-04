from backend.ml.predictor import predictor
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_predictor_evaluate_all_actions():
    customer = {
        "customer_age": 32,
        "customer_lifetime_days": 120,
        "lifetime_value_paisa": 5000000,
        "total_transactions": 15,
        "successful_transactions": 14,
        "failed_transactions": 1,
        "historical_success_rate": 0.93,
        "preferred_payment_method": "upi"
    }
    payment = {
        "amount_paisa": 499900,
        "failure_reason": "bank_timeout",
        "payment_method": "card",
        "retry_count": 0
    }
    
    res = predictor.evaluate_all_actions(customer, payment)
    
    assert "recommended_action" in res
    assert "all_actions" in res
    assert len(res["all_actions"]) == 5
    
    # For bank_timeout, RETRY should yield high probability
    actions_by_prob = {a["action"]: a["probability"] for a in res["all_actions"]}
    assert actions_by_prob["RETRY"] > 0.60

def test_prediction_api_endpoint():
    payload = {
        "customer_details": {
            "historical_success_rate": 0.90,
            "total_transactions": 10
        },
        "payment_details": {
            "amount_paisa": 499900,
            "failure_reason": "card_expired"
        }
    }
    response = client.post("/api/prediction/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "prediction" in data
    # For card_expired, PAYMENT_LINK should rank higher than RETRY
    actions = data["prediction"]["all_actions"]
    p_link = next(a for a in actions if a["action"] == "PAYMENT_LINK")
    p_retry = next(a for a in actions if a["action"] == "RETRY")
    assert p_link["probability"] > p_retry["probability"]

def test_predictor_explain_prediction():
    """Verify explain_prediction returns structured feature contributions."""
    customer = {
        "lifetime_value_paisa": 3500000,
        "historical_success_rate": 0.95
    }
    payment = {
        "amount_paisa": 150000,
        "failure_reason": "bank_timeout",
        "payment_method": "upi",
        "retry_count": 0
    }
    attributions = predictor.explain_prediction(customer, payment, action="PAYMENT_LINK")
    assert isinstance(attributions, list)
    assert len(attributions) >= 3
    
    for attr in attributions:
        assert "feature_name" in attr
        assert "impact_pct" in attr
        assert attr["direction"] in ["positive", "negative"]
        assert "explanation" in attr
        assert isinstance(attr["explanation"], str)
