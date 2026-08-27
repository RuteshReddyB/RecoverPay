from backend.policies.policy_engine import policy_engine
from backend.schemas.policy import MerchantPolicySchema

def test_policy_engine_approval():
    res = policy_engine.validate_action(
        action="RETRY",
        amount_paisa=499900,  # ₹4,999
        probability=0.85,
        retry_count=0
    )
    assert res.status == "APPROVED"
    assert res.checks_passed["amount_limit_check"] is True
    assert res.checks_passed["probability_check"] is True

def test_policy_engine_high_value_escalation():
    # ₹15,000 exceeds ₹10,000 limit -> HUMAN_ESCALATION
    res = policy_engine.validate_action(
        action="RETRY",
        amount_paisa=1500000,
        probability=0.85,
        retry_count=0
    )
    assert res.status == "HUMAN_ESCALATION"
    assert "exceeds auto-recovery threshold" in res.reason

def test_policy_engine_max_retry_blocked():
    # retry_count = 2 reaches limit -> RETRY BLOCKED
    res = policy_engine.validate_action(
        action="RETRY",
        amount_paisa=499900,
        probability=0.85,
        retry_count=2
    )
    assert res.status == "BLOCKED"
    assert "Maximum retry limit reached" in res.reason

def test_policy_engine_low_probability_blocked():
    # probability = 0.30 (< 0.40 limit) -> BLOCKED
    res = policy_engine.validate_action(
        action="RETRY",
        amount_paisa=499900,
        probability=0.30,
        retry_count=0
    )
    assert res.status == "BLOCKED"
    assert "below minimum threshold" in res.reason
