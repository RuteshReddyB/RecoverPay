from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.schemas.policy import MerchantPolicySchema
from backend.services.db_service import PolicyRepository
from backend.utils.money import paisa_to_rupees

class PolicyResult(BaseModel):
    status: str = Field(..., description="APPROVED, BLOCKED, or HUMAN_ESCALATION")
    action: str
    amount_paisa: int
    amount_rupees: float
    probability: float
    expected_recovery_paisa: int
    expected_recovery_rupees: float
    checks_passed: Dict[str, bool]
    reason: str

class PolicyEngine:
    def __init__(self, policy: Optional[MerchantPolicySchema] = None):
        self._policy = policy

    def get_policy(self) -> MerchantPolicySchema:
        if self._policy:
            return self._policy
        self._policy = PolicyRepository.get_policy()
        return self._policy

    def validate_action(
        self,
        action: str,
        amount_paisa: int,
        probability: float,
        retry_count: int = 0,
        contact_attempts: int = 0,
        customer_context: Optional[Dict[str, Any]] = None
    ) -> PolicyResult:
        """
        Validate a proposed recovery action against hard business policies.
        Deterministically overrides LLM/Agent recommendations if boundaries are breached.
        """
        policy = self.get_policy()
        customer_context = customer_context or {}
        
        checks = {
            "amount_limit_check": amount_paisa <= policy.max_auto_recovery_amount_paisa,
            "retry_limit_check": retry_count < policy.max_retry_attempts if action == "RETRY" else True,
            "probability_check": probability >= policy.min_recovery_probability,
            "contact_limit_check": contact_attempts < policy.max_contact_attempts,
            "auto_recovery_enabled": policy.auto_recovery_enabled
        }
        
        rupees = float(paisa_to_rupees(amount_paisa))
        exp_paisa = int(round(amount_paisa * probability))
        exp_rupees = float(paisa_to_rupees(exp_paisa))

        # Check 1: Auto Recovery Disabled
        if not checks["auto_recovery_enabled"]:
            return PolicyResult(
                status="BLOCKED",
                action=action,
                amount_paisa=amount_paisa,
                amount_rupees=rupees,
                probability=probability,
                expected_recovery_paisa=exp_paisa,
                expected_recovery_rupees=exp_rupees,
                checks_passed=checks,
                reason="Merchant auto-recovery is globally disabled."
            )

        # Check 2: High Value Transaction (> ₹10,000 default threshold) -> Escalates to Human
        if not checks["amount_limit_check"]:
            return PolicyResult(
                status="HUMAN_ESCALATION",
                action=action,
                amount_paisa=amount_paisa,
                amount_rupees=rupees,
                probability=probability,
                expected_recovery_paisa=exp_paisa,
                expected_recovery_rupees=exp_rupees,
                checks_passed=checks,
                reason=f"Transaction amount Rs. {rupees:,.2f} exceeds auto-recovery threshold of Rs. {policy.max_auto_recovery_amount_rupees:,.2f}. Escalating for human review."
            )

        # Check 3: Action is RETRY but max retry attempts reached -> Block RETRY
        if action == "RETRY" and not checks["retry_limit_check"]:
            return PolicyResult(
                status="BLOCKED",
                action=action,
                amount_paisa=amount_paisa,
                amount_rupees=rupees,
                probability=probability,
                expected_recovery_paisa=exp_paisa,
                expected_recovery_rupees=exp_rupees,
                checks_passed=checks,
                reason=f"Maximum retry limit reached ({retry_count}/{policy.max_retry_attempts}). RETRY action blocked."
            )

        # Check 4: Low Probability of Recovery (< 40%) -> Block Autonomous Execution
        if not checks["probability_check"]:
            return PolicyResult(
                status="BLOCKED",
                action=action,
                amount_paisa=amount_paisa,
                amount_rupees=rupees,
                probability=probability,
                expected_recovery_paisa=exp_paisa,
                expected_recovery_rupees=exp_rupees,
                checks_passed=checks,
                reason=f"Predicted recovery probability ({probability*100:.1f}%) is below minimum threshold ({policy.min_recovery_probability*100:.0f}%)."
            )

        # Check 5: Maximum Contact Attempts Exceeded
        if not checks["contact_limit_check"]:
            return PolicyResult(
                status="BLOCKED",
                action=action,
                amount_paisa=amount_paisa,
                amount_rupees=rupees,
                probability=probability,
                expected_recovery_paisa=exp_paisa,
                expected_recovery_rupees=exp_rupees,
                checks_passed=checks,
                reason=f"Contact attempt limit reached ({contact_attempts}/{policy.max_contact_attempts})."
            )

        # All Policy Checks Passed -> APPROVED
        return PolicyResult(
            status="APPROVED",
            action=action,
            amount_paisa=amount_paisa,
            amount_rupees=rupees,
            probability=probability,
            expected_recovery_paisa=exp_paisa,
            expected_recovery_rupees=exp_rupees,
            checks_passed=checks,
            reason="All merchant policy checks passed successfully."
        )

policy_engine = PolicyEngine()
