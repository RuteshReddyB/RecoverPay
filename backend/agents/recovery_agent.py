import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from backend.tools.recovery_tools import (
    get_payment_details,
    get_customer_history,
    predict_recovery_probability,
    calculate_expected_recovery,
    validate_policy,
    execute_razorpay_action,
    escalate_to_human,
    record_outcome
)
from backend.services.decision_engine import decision_engine
from backend.utils.logger import logger

class AgentReasoningStep(BaseModel):
    step_index: int
    tool_name: str
    input_args: Dict[str, Any]
    tool_output: Dict[str, Any]
    reasoning: str

class AgentExecutionResult(BaseModel):
    payment_id: str
    status: str
    recommended_action: str
    policy_status: str
    policy_reason: str
    expected_recovery_rupees: float
    probability_pct: float
    execution_result: Dict[str, Any]
    reasoning_trace: List[AgentReasoningStep]
    completed_at: str

class AutonomousRecoveryAgent:
    """
    Autonomous Revenue Recovery Agent.
    Executes structured tool calling pipeline: Detect -> Diagnose -> Predict -> Validate Policy -> Execute -> Measure
    """
    def run_recovery_workflow(self, payment_id: str, customer_id: Optional[str] = None) -> AgentExecutionResult:
        trace: List[AgentReasoningStep] = []
        step_counter = 1

        logger.info(f"[AGENT START] Beginning autonomous recovery workflow for Payment {payment_id}")

        # Step 1: Detect & Fetch Payment Details
        payment_info = get_payment_details(payment_id)
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="get_payment_details",
            input_args={"payment_id": payment_id},
            tool_output=payment_info,
            reasoning=f"Step 1 (Detect): Retrieved payment record. Amount = Rs. {payment_info['amount_rupees']:,.2f}, Failure Reason = '{payment_info['failure_reason']}'."
        ))
        step_counter += 1

        # Step 2: Retrieve Customer Profile & History
        cid = customer_id or payment_info.get("customer_id", "c_demo_101")
        customer_info = get_customer_history(cid)
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="get_customer_history",
            input_args={"customer_id": cid},
            tool_output=customer_info,
            reasoning=f"Step 2 (Diagnose): Analyzed customer profile. Historical success rate = {customer_info['historical_success_rate']*100:.1f}%, Lifetime Value = Rs. {customer_info['lifetime_value_rupees']:,.2f}."
        ))
        step_counter += 1

        # Step 3: Run ML Probability Prediction Across Actions
        pred_res = predict_recovery_probability(
            customer_id=cid,
            payment_id=payment_id,
            failure_reason=payment_info["failure_reason"]
        )
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="predict_recovery_probability",
            input_args={"customer_id": cid, "payment_id": payment_id, "failure_reason": payment_info["failure_reason"]},
            tool_output=pred_res,
            reasoning="Step 3 (Predict): Ran XGBoost probability prediction model across candidate interventions."
        ))
        step_counter += 1

        # Step 4: Decision Engine Expected Recovery Calculation & Policy Validation
        decision = decision_engine.select_best_recovery_action(customer_info, payment_info)
        chosen_action = decision.recommended_action
        
        calc_res = calculate_expected_recovery(payment_info["amount_paisa"], decision.probability)
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="calculate_expected_recovery",
            input_args={"amount_paisa": payment_info["amount_paisa"], "probability": decision.probability},
            tool_output=calc_res,
            reasoning=f"Step 4 (Decide): Calculated Expected Recovery Value = Rs. {decision.expected_recovery_rupees:,.2f} for recommended action '{chosen_action}' ({decision.probability_pct}% probability)."
        ))
        step_counter += 1

        # Step 5: Policy Safety Check Validation
        policy_res = validate_policy(
            action=chosen_action,
            amount_paisa=payment_info["amount_paisa"],
            probability=decision.probability,
            retry_count=payment_info.get("retry_count", 0)
        )
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="validate_policy",
            input_args={"action": chosen_action, "amount_paisa": payment_info["amount_paisa"], "probability": decision.probability},
            tool_output=policy_res,
            reasoning=f"Step 5 (Policy Engine): Policy check status = '{policy_res['status']}'. Reason: {policy_res['reason']}"
        ))
        step_counter += 1

        # Step 6: Action Execution (or Human Escalation)
        execution_res = {}
        if policy_res["status"] == "APPROVED":
            execution_res = execute_razorpay_action(payment_id, chosen_action)
            trace.append(AgentReasoningStep(
                step_index=step_counter,
                tool_name="execute_razorpay_action",
                input_args={"payment_id": payment_id, "action": chosen_action},
                tool_output=execution_res,
                reasoning=f"Step 6 (Execute): Successfully dispatched Razorpay action '{chosen_action}'."
            ))
        else:
            execution_res = escalate_to_human(payment_id, policy_res["reason"])
            trace.append(AgentReasoningStep(
                step_index=step_counter,
                tool_name="escalate_to_human",
                input_args={"payment_id": payment_id, "reason": policy_res["reason"]},
                tool_output=execution_res,
                reasoning=f"Step 6 (Escalate): Autonomous execution restricted by policy. Escalated payment {payment_id} to human queue."
            ))
        step_counter += 1

        # Step 7: Record Immutable Audit Log
        record_res = record_outcome(
            payment_id=payment_id,
            action=chosen_action,
            result_status=policy_res["status"],
            details={"policy_reason": policy_res["reason"], "execution": execution_res}
        )
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="record_outcome",
            input_args={"payment_id": payment_id, "action": chosen_action, "result_status": policy_res["status"]},
            tool_output=record_res,
            reasoning=f"Step 7 (Audit): Appended immutable audit log event with hash '{record_res['hash'][:16]}...'."
        ))

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        logger.info(f"[AGENT COMPLETE] Workflow finished for Payment {payment_id}. Outcome = {chosen_action} ({policy_res['status']})")

        return AgentExecutionResult(
            payment_id=payment_id,
            status="completed",
            recommended_action=chosen_action,
            policy_status=policy_res["status"],
            policy_reason=policy_res["reason"],
            expected_recovery_rupees=decision.expected_recovery_rupees,
            probability_pct=decision.probability_pct,
            execution_result=execution_res,
            reasoning_trace=trace,
            completed_at=now
        )

recovery_agent = AutonomousRecoveryAgent()
