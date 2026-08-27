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
