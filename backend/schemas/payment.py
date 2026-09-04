from pydantic import BaseModel, Field
from typing import Optional
from backend.utils.money import paisa_to_rupees

class PaymentBase(BaseModel):
    razorpay_payment_id: str = Field(..., description="Razorpay Payment ID e.g. pay_L123456")
    razorpay_order_id: Optional[str] = Field(default=None)
    customer_id: str = Field(...)
    amount_paisa: int = Field(..., gt=0, description="Payment amount in integer paisa")
    currency: str = Field(default="INR")
    status: str = Field(default="failed", description="Status: created, captured, failed, refunded")
    payment_method: str = Field(default="upi", description="Payment method used")
    failure_reason: str = Field(default="bank_timeout", description="Failure reason category")
    failure_code: Optional[str] = Field(default="BAD_REQUEST_ERROR")
    policy_status: Optional[str] = Field(default=None)
    recommended_action: Optional[str] = Field(default=None)
    policy_reason: Optional[str] = Field(default=None)

class PaymentCreate(PaymentBase):
    pass

class PaymentSchema(PaymentBase):
    id: str
    created_at: str

    @property
    def amount_rupees(self) -> float:
        return float(paisa_to_rupees(self.amount_paisa))
