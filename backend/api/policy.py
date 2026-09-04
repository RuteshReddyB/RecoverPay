from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from backend.services.db_service import PolicyRepository
from backend.policies.policy_engine import policy_engine
from backend.schemas.policy import MerchantPolicySchema
from backend.utils.money import paisa_to_rupees, rupees_to_paisa

router = APIRouter(prefix="/api/policy", tags=["Merchant Policy"])

class PolicyUpdateRequest(BaseModel):
    max_auto_recovery_amount_rupees: float = Field(..., gt=0, description="Max auto recovery amount in Rupees e.g. 10000.0")
    max_retry_attempts: int = Field(..., ge=1, le=5, description="Max retry attempts allowed e.g. 2")
    min_recovery_probability: float = Field(..., ge=0.1, le=0.9, description="Min probability threshold e.g. 0.40")
    max_contact_attempts: int = Field(..., ge=1, le=5, description="Max contact attempts e.g. 2")
    auto_recovery_enabled: bool = Field(default=True, description="Master auto-recovery toggle")

@router.get("")
def get_merchant_policy():
    policy = PolicyRepository.get_policy()
    return {
        "status": "success",
        "policy": policy.model_dump()
    }

@router.put("")
def update_merchant_policy(request: PolicyUpdateRequest):
    try:
        amount_paisa = int(rupees_to_paisa(request.max_auto_recovery_amount_rupees))
        policy_data = MerchantPolicySchema(
            max_auto_recovery_amount_paisa=amount_paisa,
            max_retry_attempts=request.max_retry_attempts,
            min_recovery_probability=request.min_recovery_probability,
            max_contact_attempts=request.max_contact_attempts,
            auto_recovery_enabled=request.auto_recovery_enabled
        )
        updated_policy = PolicyRepository.update_policy(policy_data)
        
        # Update policy in-memory cache in policy_engine
        policy_engine._policy = updated_policy
        
        return {
            "status": "success",
            "message": "Merchant policy updated successfully",
            "policy": updated_policy.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update merchant policy: {str(e)}")
