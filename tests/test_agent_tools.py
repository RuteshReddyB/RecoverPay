from backend.tools.recovery_tools import (
    get_payment_details,
    get_customer_history,
    predict_recovery_probability,
    calculate_expected_recovery,
    validate_policy,
    execute_razorpay_action,
    escalate_to_human,
    record_outcome,
    AGENT_TOOLS_MANIFEST
)

def test_agent_tools_manifest():
    assert len(AGENT_TOOLS_MANIFEST) == 8
    assert "get_payment_details" in AGENT_TOOLS_MANIFEST
    assert "record_outcome" in AGENT_TOOLS_MANIFEST

def test_get_payment_details_tool():
    res = get_payment_details("pay_test_999")
    assert res["status"] == "found"
    assert "amount_paisa" in res
    assert "amount_rupees" in res

def test_predict_recovery_probability_tool():
    res = predict_recovery_probability("c_test", "p_test", failure_reason="bank_timeout", action="RETRY")
    assert res["status"] == "success"
    assert "probability" in res
    assert len(res["all_candidate_actions"]) == 5

def test_validate_policy_tool():
    res = validate_policy(action="RETRY", amount_paisa=499900, probability=0.85, retry_count=0)
    assert res["status"] == "APPROVED"
    assert res["checks_passed"]["amount_limit_check"] is True

def test_execute_razorpay_action_tool():
    res = execute_razorpay_action("p_test_101", "PAYMENT_LINK")
    assert res["status"] == "executed"
    assert "payment_link_id" in res["result"]

def test_record_outcome_tool():
    res = record_outcome("p_test_101", "PAYMENT_LINK", "APPROVED")
    assert res["status"] == "recorded"
    assert "audit_log_id" in res
