from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from backend.agents.recovery_agent import recovery_agent
from backend.tools.recovery_tools import AGENT_TOOLS_MANIFEST

router = APIRouter(prefix="/api/agent", tags=["Autonomous Agent"])

class AgentRunRequest(BaseModel):
    payment_id: str = Field(..., description="Payment ID e.g. p_test_101 or pay_rzp_101")
    customer_id: Optional[str] = Field(default=None, description="Optional Customer ID")

from backend.services.db_service import PaymentRepository, CustomerRepository
from backend.schemas.payment import PaymentCreate
from backend.schemas.customer import CustomerCreate
from backend.tools.recovery_tools import get_payment_details

@router.post("/run")
def run_autonomous_agent(request: AgentRunRequest):
    try:
        # Ensure customer exists
        cid = request.customer_id or "c_demo_101"
        if not CustomerRepository.get_customer(cid):
            CustomerRepository.create_customer(CustomerCreate(
                name="Simulated Customer",
                email="demo@example.com",
                phone="+919876543210",
                lifetime_value_paisa=5000000,
                historical_success_rate=0.75,
                total_transactions_count=5
            ), customer_id=cid)

        # Ensure payment exists in database so it shows up in recovery queue & UI
        pmt = PaymentRepository.get_payment(request.payment_id)
        if not pmt:
            p_details = get_payment_details(request.payment_id)
            PaymentRepository.create_payment(PaymentCreate(
                razorpay_payment_id=p_details["razorpay_payment_id"],
                customer_id=cid,
                amount_paisa=p_details["amount_paisa"],
                currency="INR",
                status="failed",
                payment_method=p_details["payment_method"],
                failure_reason=p_details["failure_reason"]
            ), payment_id=request.payment_id)

        result = recovery_agent.run_recovery_workflow(
            payment_id=request.payment_id,
            customer_id=cid
        )
        return {
            "status": "success",
            "agent_execution": result.model_dump(),
            "agent_result": result.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")

@router.get("/tools")
def list_agent_tools():
    tools_list = []
    for name, func in AGENT_TOOLS_MANIFEST.items():
        tools_list.append({
            "name": name,
            "description": func.__doc__.strip() if func.__doc__ else "Agent Tool Function",
            "module": func.__module__
        })
    return {
        "status": "success",
        "total_tools": len(tools_list),
        "tools": tools_list
    }
