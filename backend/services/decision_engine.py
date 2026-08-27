from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from backend.ml.predictor import predictor
from backend.policies.policy_engine import policy_engine, PolicyResult
from backend.utils.money import paisa_to_rupees

class DecisionOutcome(BaseModel):
    recommended_action: str
    expected_recovery_paisa: int
    expected_recovery_rupees: float
    probability: float
    probability_pct: float
    policy_status: str
    policy_reason: str
    all_evaluated_options: List[Dict[str, Any]]
    policy_checks_passed: Dict[str, bool]

class DecisionEngine:
    def __init__(self):
        self.predictor = predictor
        self.policy_engine = policy_engine

    def select_best_recovery_action(
        self,
        customer_dict: Dict[str, Any],
        payment_dict: Dict[str, Any]
    ) -> DecisionOutcome:
        """
        Evaluate candidate recovery actions, apply Policy Engine safety checks,
        and select the action that maximizes expected recovery value.
        """
        amount_paisa = payment_dict.get("amount_paisa", 499900)
        retry_count = payment_dict.get("retry_count", 0)
        contact_attempts = payment_dict.get("contact_attempts", 0)

        # 1. Get ML probabilities for all candidate actions
        ml_eval = self.predictor.evaluate_all_actions(customer_dict, payment_dict)
        candidate_actions = ml_eval.get("all_actions", [])

        evaluated_options = []
        approved_options = []

        # 2. Filter & validate each candidate action through Policy Engine
        for option in candidate_actions:
            action = option["action"]
            prob = option["probability"]

            if action == "HUMAN_ESCALATION":
                policy_res = PolicyResult(
                    status="HUMAN_ESCALATION",
                    action=action,
                    amount_paisa=amount_paisa,
                    amount_rupees=float(paisa_to_rupees(amount_paisa)),
                    probability=prob,
                    expected_recovery_paisa=option["expected_recovery_paisa"],
                    expected_recovery_rupees=option["expected_recovery_rupees"],
                    checks_passed={"amount_limit_check": True, "probability_check": True},
                    reason="Escalated to human operator for manual intervention."
                )
            else:
                policy_res = self.policy_engine.validate_action(
                    action=action,
                    amount_paisa=amount_paisa,
                    probability=prob,
                    retry_count=retry_count,
                    contact_attempts=contact_attempts,
                    customer_context=customer_dict
                )

            opt_record = {
                "action": action,
                "probability": prob,
                "probability_pct": round(prob * 100, 1),
                "expected_recovery_paisa": option["expected_recovery_paisa"],
                "expected_recovery_rupees": option["expected_recovery_rupees"],
                "policy_status": policy_res.status,
                "policy_reason": policy_res.reason,
                "checks_passed": policy_res.checks_passed
            }
            evaluated_options.append(opt_record)

            if policy_res.status == "APPROVED":
                approved_options.append(opt_record)

        # 3. Select optimal action
        if approved_options:
            # Sort approved options by expected recovery value descending
            approved_options.sort(key=lambda x: x["expected_recovery_paisa"], reverse=True)
            best_opt = approved_options[0]
            
            return DecisionOutcome(
                recommended_action=best_opt["action"],
                expected_recovery_paisa=best_opt["expected_recovery_paisa"],
                expected_recovery_rupees=best_opt["expected_recovery_rupees"],
                probability=best_opt["probability"],
                probability_pct=best_opt["probability_pct"],
                policy_status="APPROVED",
                policy_reason=best_opt["policy_reason"],
                all_evaluated_options=evaluated_options,
                policy_checks_passed=best_opt["checks_passed"]
            )
        else:
            # If no automated action is approved, fallback to HUMAN_ESCALATION
            human_opt = next((o for o in evaluated_options if o["action"] == "HUMAN_ESCALATION"), evaluated_options[0])
            first_policy_reason = evaluated_options[0]["policy_reason"] if evaluated_options else "No action approved by policy engine."
            
            return DecisionOutcome(
                recommended_action="HUMAN_ESCALATION",
                expected_recovery_paisa=0,
                expected_recovery_rupees=0.0,
                probability=human_opt["probability"],
                probability_pct=human_opt["probability_pct"],
                policy_status="HUMAN_ESCALATION",
                policy_reason=f"Automated recovery restricted: {first_policy_reason}",
                all_evaluated_options=evaluated_options,
                policy_checks_passed=human_opt["checks_passed"]
            )

decision_engine = DecisionEngine()
