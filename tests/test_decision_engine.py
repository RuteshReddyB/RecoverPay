from backend.services.decision_engine import decision_engine

def test_decision_engine_selection():
    customer = {
        "historical_success_rate": 0.94,
        "total_transactions": 17,
        "lifetime_value_paisa": 5000000
    }
    payment = {
        "amount_paisa": 499900,
        "failure_reason": "bank_timeout",
        "retry_count": 0
    }
    
    outcome = decision_engine.select_best_recovery_action(customer, payment)
    assert outcome.recommended_action == "RETRY"
    assert outcome.policy_status == "APPROVED"
    assert outcome.expected_recovery_paisa > 0

def test_decision_engine_card_expired_selection():
    customer = {
        "historical_success_rate": 0.90,
        "total_transactions": 10
    }
    payment = {
        "amount_paisa": 799900,
        "failure_reason": "card_expired",
        "retry_count": 1
    }
    
    outcome = decision_engine.select_best_recovery_action(customer, payment)
    assert outcome.recommended_action == "PAYMENT_LINK"
    assert outcome.policy_status == "APPROVED"

def test_decision_engine_high_value_escalation():
    customer = {"historical_success_rate": 0.95}
    payment = {
        "amount_paisa": 1500000, # ₹15,000 > ₹10,000 limit
        "failure_reason": "bank_timeout"
    }
    
    outcome = decision_engine.select_best_recovery_action(customer, payment)
    assert outcome.recommended_action == "HUMAN_ESCALATION"
    assert outcome.policy_status == "HUMAN_ESCALATION"
