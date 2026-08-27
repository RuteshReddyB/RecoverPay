from pydantic import BaseModel, Field
from typing import Optional
from backend.utils.money import paisa_to_rupees

class RecoveryActionEnum(str):
    RETRY = "RETRY"
    PAYMENT_LINK = "PAYMENT_LINK"
    REMINDER = "REMINDER"
    SCHEDULE_FOLLOWUP = "SCHEDULE_FOLLOWUP"
    HUMAN_ESCALATION = "HUMAN_ESCALATION"

class PolicyStatusEnum(str):
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"
    HUMAN_ESCALATION = "HUMAN_ESCALATION"

class RecoveryAttemptCreate(BaseModel):
    payment_id: str
    customer_id: str
    action: str
    predicted_probability: float = Field(..., ge=0.0, le=1.0)
    expected_recovery_paisa: int = Field(..., ge=0)
    policy_status: str
    policy_reason: str

class RecoveryAttemptSchema(RecoveryAttemptCreate):
    id: str
    execution_status: str = Field(default="PENDING")  # PENDING, SUCCESS, FAILED, SKIPPED
    amount_recovered_paisa: int = Field(default=0)
    razorpay_action_reference_id: Optional[str] = None
    executed_at: str
    completed_at: Optional[str] = None

    @property
    def expected_recovery_rupees(self) -> float:
        return float(paisa_to_rupees(self.expected_recovery_paisa))

    @property
    def amount_recovered_rupees(self) -> float:
        return float(paisa_to_rupees(self.amount_recovered_paisa))
