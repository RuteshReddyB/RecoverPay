from pydantic import BaseModel, Field
from backend.utils.money import paisa_to_rupees

class MerchantPolicySchema(BaseModel):
    id: str = "default_policy"
    merchant_id: str = "m_default"
    max_auto_recovery_amount_paisa: int = Field(default=1000000, description="Max amount in paisa eligible for autonomous recovery e.g. ₹10,000")
    max_retry_attempts: int = Field(default=2)
    min_recovery_probability: float = Field(default=0.40, ge=0.0, le=1.0)
    max_contact_attempts: int = Field(default=2)
    auto_recovery_enabled: bool = Field(default=True)

    @property
    def max_auto_recovery_amount_rupees(self) -> float:
        return float(paisa_to_rupees(self.max_auto_recovery_amount_paisa))
