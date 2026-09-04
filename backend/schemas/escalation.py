from pydantic import BaseModel, Field
from typing import Optional

class EscalationResolveRequest(BaseModel):
    resolution_action: str = Field(
        ...,
        description="Action to execute: MANUAL_RETRY, SEND_VIP_LINK, MARK_RESOLVED_OFFLINE, WRITE_OFF"
    )
    operator_notes: str = Field(
        ...,
        description="Operational justification and resolution details entered by the merchant operator"
    )
    resolved_by: Optional[str] = Field(
        default="Operator (Dashboard)",
        description="Name or ID of the operator resolving the case"
    )

class EscalationResolveResponse(BaseModel):
    status: str
    payment_id: str
    resolution_action: str
    new_status: str
    audit_log_id: str
    message: str
