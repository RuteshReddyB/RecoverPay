from pydantic import BaseModel, Field, EmailStr, field_serializer
from typing import Optional
from backend.utils.security import mask_email, mask_phone
from backend.utils.money import paisa_to_rupees

class CustomerBase(BaseModel):
    name: str = Field(..., description="Customer full name")
    email: str = Field(..., description="Customer email address")
    phone: str = Field(..., description="Customer phone number")
    preferred_payment_method: str = Field(default="upi", description="Preferred payment method (upi, card, netbanking, wallet)")

class CustomerCreate(CustomerBase):
    pass

class CustomerSchema(CustomerBase):
    id: str
    lifetime_value_paisa: int = Field(default=0)
    total_transactions: int = Field(default=0)
    successful_transactions: int = Field(default=0)
    failed_transactions: int = Field(default=0)
    historical_success_rate: float = Field(default=1.0)
    risk_score: float = Field(default=0.0)

    @property
    def lifetime_value_rupees(self) -> float:
        return float(paisa_to_rupees(self.lifetime_value_paisa))

class CustomerPublicSchema(CustomerSchema):
    """
    Public schema with PII masked for Zero Data Leak compliance.
    """
    @field_serializer("email")
    def serialize_email(self, email: str, _info) -> str:
        return mask_email(email)

    @field_serializer("phone")
    def serialize_phone(self, phone: str, _info) -> str:
        return mask_phone(phone)
