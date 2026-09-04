import datetime
from typing import Dict, Any, List, Optional, Set
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
    agent_attempts: int

class AutonomousRecoveryAgent:
    """
    Autonomous Revenue Recovery Agent.

    Executes a structured 7-step tool-calling pipeline:
        Detect → Diagnose → Predict (all actions) → Decide → Validate Policy → Execute → Audit

    The agent is capable of re-evaluating after a failed action (up to MAX_AGENT_ATTEMPTS
    total attempts), subject to policy guard and stopping rules. This makes the agent
    genuinely adaptive rather than purely single-pass deterministic.

    Architecture:
        Event
         ↓
        Context Retrieval      (Steps 1–2: get_payment_details, get_customer_history)
         ↓
        ML Prediction          (Step 3: predict_recovery_probability → all 5 actions)
         ↓
        Decision + Policy      (Step 4: decision_engine → policy_engine filter)
         ↓
        Execution              (Step 5: execute_razorpay_action or escalate_to_human)
         ↓
        Outcome Verification   (Step 6: check result; retry loop if failed)
         ↓
        Audit                  (Step 7: record_outcome → SHA-256 audit log)
    """

    MAX_AGENT_ATTEMPTS = 2  # Maximum re-evaluation attempts if execution fails

    def run_recovery_workflow(
        self,
        payment_id: str,
        customer_id: Optional[str] = None
    ) -> AgentExecutionResult:
        trace: List[AgentReasoningStep] = []
        step_counter = 1
        attempted_actions: Set[str] = set()
        agent_attempts = 0

        logger.info(f"[AGENT START] Beginning autonomous recovery workflow for Payment {payment_id}")

        # ── Step 1: Detect & Fetch Payment Details ───────────────────────────
        payment_info = get_payment_details(payment_id)
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="get_payment_details",
            input_args={"payment_id": payment_id},
            tool_output=payment_info,
            reasoning=(
                f"Step 1 (Detect): Retrieved payment record. "
                f"Amount = ₹{payment_info['amount_rupees']:,.2f}, "
                f"Failure Reason = '{payment_info['failure_reason']}'."
            )
        ))
        step_counter += 1

        # ── Step 2: Retrieve Customer Profile & History ──────────────────────
        cid = customer_id or payment_info.get("customer_id", "c_demo_101")
        customer_info = get_customer_history(cid)
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="get_customer_history",
            input_args={"customer_id": cid},
            tool_output=customer_info,
            reasoning=(
                f"Step 2 (Diagnose): Analyzed customer profile. "
                f"Historical success rate = {customer_info['historical_success_rate'] * 100:.1f}%, "
                f"Lifetime Value = ₹{customer_info['lifetime_value_rupees']:,.2f}."
            )
        ))
        step_counter += 1

        # ── Step 3: ML Probability Prediction — All Candidate Actions ────────
        # Called with no `action` arg → returns full 5-action probability table.
        # This is what the trace actually represents: the model evaluated every
        # candidate action, not just RETRY.
        pred_res = predict_recovery_probability(
            customer_id=cid,
            payment_id=payment_id,
            failure_reason=payment_info["failure_reason"]
            # action=None (default) → multi-action evaluation
        )
        all_action_probs = pred_res.get("all_candidate_actions", [])
        action_table_str = ", ".join(
            f"{a['action']}={a['probability_pct']}%" for a in all_action_probs
        )
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="predict_recovery_probability",
            input_args={
                "customer_id": cid,
                "payment_id": payment_id,
                "failure_reason": payment_info["failure_reason"],
                "action": None  # Explicitly noting multi-action mode
            },
            tool_output=pred_res,
            reasoning=(
                f"Step 3 (Predict): ML model evaluated all 5 candidate actions. "
                f"Probabilities: [{action_table_str}]. "
                f"Model recommended: '{pred_res.get('recommended_action')}' "
                f"at {pred_res.get('recommended_probability', 0) * 100:.1f}%."
            )
        ))
        step_counter += 1

        # ── Agent Retry Loop ─────────────────────────────────────────────────
        # Attempts the best policy-approved action. If execution fails, re-evaluates
        # with the failed action excluded and tries the next best option.
        final_execution_res: Dict[str, Any] = {}
        final_chosen_action = "HUMAN_ESCALATION"
        final_decision = None
        policy_res_dict: Dict[str, Any] = {}

        while agent_attempts < self.MAX_AGENT_ATTEMPTS:
            agent_attempts += 1

            # ── Step 4: Decision Engine ─ Select Best Allowed Action ──────────
            decision = decision_engine.select_best_recovery_action(
                customer_info,
                payment_info,
                exclude_actions=list(attempted_actions)
            )
            chosen_action = decision.recommended_action
            final_decision = decision

            calc_res = calculate_expected_recovery(
                payment_info["amount_paisa"],
                decision.probability
            )
            attempt_label = f"Attempt {agent_attempts}/{self.MAX_AGENT_ATTEMPTS}"
            trace.append(AgentReasoningStep(
                step_index=step_counter,
                tool_name="calculate_expected_recovery",
                input_args={
                    "amount_paisa": payment_info["amount_paisa"],
                    "probability": decision.probability,
                    "excluded_actions": list(attempted_actions)
                },
                tool_output={**calc_res, "recommended_action": chosen_action},
                reasoning=(
                    f"Step 4 (Decide) [{attempt_label}]: "
                    f"Expected Recovery Value = ₹{decision.expected_recovery_rupees:,.2f} "
                    f"for action '{chosen_action}' ({decision.probability_pct}% probability). "
                    f"Policy status: {decision.policy_status}."
                )
            ))
            step_counter += 1

            # ── Step 5: Policy Safety Check ───────────────────────────────────
            policy_res = validate_policy(
                action=chosen_action,
                amount_paisa=payment_info["amount_paisa"],
                probability=decision.probability,
                retry_count=payment_info.get("retry_count", 0)
            )
            policy_res_dict = policy_res
            trace.append(AgentReasoningStep(
                step_index=step_counter,
                tool_name="validate_policy",
                input_args={
                    "action": chosen_action,
                    "amount_paisa": payment_info["amount_paisa"],
                    "probability": decision.probability
                },
                tool_output=policy_res,
                reasoning=(
                    f"Step 5 (Policy Engine) [{attempt_label}]: "
                    f"Policy check status = '{policy_res['status']}'. "
                    f"Reason: {policy_res['reason']}"
                )
            ))
            step_counter += 1

            # ── Step 6: Execute or Escalate ───────────────────────────────────
            if policy_res["status"] == "APPROVED":
                execution_res = execute_razorpay_action(payment_id, chosen_action)
                attempted_actions.add(chosen_action)

                exec_status = execution_res.get("status", "")
                trace.append(AgentReasoningStep(
                    step_index=step_counter,
                    tool_name="execute_razorpay_action",
                    input_args={"payment_id": payment_id, "action": chosen_action},
                    tool_output=execution_res,
                    reasoning=(
                        f"Step 6 (Execute) [{attempt_label}]: "
                        f"Dispatched Razorpay action '{chosen_action}'. "
                        f"Result status: '{exec_status}'."
                    )
                ))
                step_counter += 1

                final_execution_res = execution_res
                final_chosen_action = chosen_action

                # Success — stop retry loop
                if exec_status in ("executed", "success", "dispatched", "initiated"):
                    logger.info(
                        f"[AGENT] Action '{chosen_action}' succeeded on attempt {agent_attempts}. Stopping."
                    )
                    break

                # Execution failed — log re-evaluation if attempts remain
                if agent_attempts < self.MAX_AGENT_ATTEMPTS:
                    logger.warning(
                        f"[AGENT] Action '{chosen_action}' execution returned status '{exec_status}'. "
                        f"Re-evaluating with {self.MAX_AGENT_ATTEMPTS - agent_attempts} attempt(s) remaining."
                    )
                    trace.append(AgentReasoningStep(
                        step_index=step_counter,
                        tool_name="agent_re_evaluation",
                        input_args={"failed_action": chosen_action, "attempts_remaining": self.MAX_AGENT_ATTEMPTS - agent_attempts},
                        tool_output={"status": "re_evaluating", "excluded_actions": list(attempted_actions)},
                        reasoning=(
                            f"Step 6b (Re-Evaluate): Action '{chosen_action}' did not succeed. "
                            f"Excluding it from next decision cycle. "
                            f"Remaining attempts: {self.MAX_AGENT_ATTEMPTS - agent_attempts}."
                        )
                    ))
                    step_counter += 1
                    continue  # Re-enter loop with failed action excluded

            else:
                # Policy blocked or human escalation — escalate immediately
                execution_res = escalate_to_human(payment_id, policy_res["reason"])
                trace.append(AgentReasoningStep(
                    step_index=step_counter,
                    tool_name="escalate_to_human",
                    input_args={"payment_id": payment_id, "reason": policy_res["reason"]},
                    tool_output=execution_res,
                    reasoning=(
                        f"Step 6 (Escalate) [{attempt_label}]: "
                        f"Autonomous execution restricted by policy ('{policy_res['status']}'). "
                        f"Escalated payment {payment_id} to human review queue."
                    )
                ))
                step_counter += 1
                final_execution_res = execution_res
                final_chosen_action = chosen_action
                break  # Don't retry escalations

        # ── Step 7: Record Immutable Audit Log ───────────────────────────────
        result_status = policy_res_dict.get("status", "UNKNOWN")
        record_res = record_outcome(
            payment_id=payment_id,
            action=final_chosen_action,
            result_status=result_status,
            details={
                "policy_reason": policy_res_dict.get("reason", ""),
                "execution": final_execution_res,
                "agent_attempts": agent_attempts
            }
        )
        trace.append(AgentReasoningStep(
            step_index=step_counter,
            tool_name="record_outcome",
            input_args={
                "payment_id": payment_id,
                "action": final_chosen_action,
                "result_status": result_status
            },
            tool_output=record_res,
            reasoning=(
                f"Step 7 (Audit): Appended immutable audit log entry with hash "
                f"'{record_res['hash'][:16]}...' after {agent_attempts} agent attempt(s)."
            )
        ))

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        logger.info(
            f"[AGENT COMPLETE] Workflow finished for Payment {payment_id}. "
            f"Outcome = {final_chosen_action} ({result_status}). "
            f"Attempts used: {agent_attempts}/{self.MAX_AGENT_ATTEMPTS}."
        )

        return AgentExecutionResult(
            payment_id=payment_id,
            status="completed",
            recommended_action=final_chosen_action,
            policy_status=result_status,
            policy_reason=policy_res_dict.get("reason", ""),
            expected_recovery_rupees=final_decision.expected_recovery_rupees if final_decision else 0.0,
            probability_pct=final_decision.probability_pct if final_decision else 0.0,
            execution_result=final_execution_res,
            reasoning_trace=trace,
            completed_at=now,
            agent_attempts=agent_attempts
        )

recovery_agent = AutonomousRecoveryAgent()
