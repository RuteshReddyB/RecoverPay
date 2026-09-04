from backend.agents.recovery_agent import recovery_agent
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_autonomous_recovery_agent_workflow():
    result = recovery_agent.run_recovery_workflow(payment_id="p_test_agent_101")
    
    assert result.status == "completed"
    assert result.recommended_action in ["RETRY", "PAYMENT_LINK", "REMINDER", "SCHEDULE_FOLLOWUP", "HUMAN_ESCALATION"]
    assert result.policy_status in ["APPROVED", "BLOCKED", "HUMAN_ESCALATION"]
    assert len(result.reasoning_trace) >= 6
    
    # Check reasoning trace steps
    step_tools = [step.tool_name for step in result.reasoning_trace]
    assert "get_payment_details" in step_tools
    assert "get_customer_history" in step_tools
    assert "predict_recovery_probability" in step_tools
    assert "calculate_expected_recovery" in step_tools
    assert "validate_policy" in step_tools
    assert "record_outcome" in step_tools

def test_agent_api_endpoints():
    # 1. Run agent endpoint
    res = client.post("/api/agent/run", json={"payment_id": "p_test_api_101"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "agent_execution" in data
    assert len(data["agent_execution"]["reasoning_trace"]) >= 6

    # 2. Tools list endpoint
    tools_res = client.get("/api/agent/tools")
    assert tools_res.status_code == 200
    tools_data = tools_res.json()
    assert tools_data["total_tools"] == 8

def test_agent_result_has_attempts_field():
    """agent_attempts must always be present and between 1 and MAX_AGENT_ATTEMPTS (2)."""
    result = recovery_agent.run_recovery_workflow("pay_attempts_test_001")
    assert hasattr(result, "agent_attempts"), "agent_attempts field missing from AgentExecutionResult"
    assert isinstance(result.agent_attempts, int)
    assert 1 <= result.agent_attempts <= 2, (
        f"agent_attempts should be 1 or 2, got: {result.agent_attempts}"
    )

def test_agent_trace_step3_returns_all_actions():
    """Step 3 (predict_recovery_probability) must evaluate all 5 candidate actions."""
    result = recovery_agent.run_recovery_workflow("pay_multiaction_trace_001")
    step3 = next(
        (s for s in result.reasoning_trace if s.tool_name == "predict_recovery_probability"),
        None
    )
    assert step3 is not None, "predict_recovery_probability step not found in reasoning trace"
    assert step3.tool_output.get("mode") == "all_actions", (
        f"Expected mode='all_actions', got: {step3.tool_output.get('mode')}"
    )
    candidates = step3.tool_output.get("all_candidate_actions", [])
    assert len(candidates) == 5, (
        f"Expected 5 candidate actions in Step 3, got {len(candidates)}: {[c['action'] for c in candidates]}"
    )
    expected_actions = {"RETRY", "PAYMENT_LINK", "REMINDER", "SCHEDULE_FOLLOWUP", "HUMAN_ESCALATION"}
    actual_actions = {c["action"] for c in candidates}
    assert actual_actions == expected_actions, (
        f"Action set mismatch. Expected {expected_actions}, got {actual_actions}"
    )
