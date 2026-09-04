import uuid
import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from backend.agents.recovery_agent import recovery_agent
from backend.services.db_service import (
    PaymentRepository,
    CustomerRepository,
    AuditLogRepository
)
from backend.schemas.payment import PaymentCreate
from backend.schemas.customer import CustomerCreate
from backend.schemas.audit import AuditLogCreate
from backend.tools.recovery_tools import get_payment_details
from backend.utils.logger import logger

router = APIRouter(prefix="/api/simulator", tags=["Live Event Simulator"])

class SimulationRequest(BaseModel):
    event_type: str = Field(..., description="bank_timeout | card_expired | high_value | duplicate_webhook")
    customer_id: Optional[str] = Field(default=None, description="Optional Customer ID")
    payment_id: Optional[str] = Field(default=None, description="Optional Payment ID")

@router.post("/trigger")
def trigger_simulation(request: SimulationRequest):
    """
    Triggers a live end-to-end simulated payment failure scenario through the
    autonomous AI recovery pipeline, policy validation engine, and audit log.
    """
    event_type = request.event_type
    sim_id = uuid.uuid4().hex[:6]
    
    # Configure scenario specifics
    if event_type == "bank_timeout":
        amount_paisa = 499900
        failure_reason = "bank_timeout"
        cust_id = request.customer_id or f"c_sim_bank_{sim_id}"
        cust_name = "Vikram Sharma"
        cust_email = "vikram.sharma@example.com"
        success_rate = 0.92
    elif event_type == "card_expired":
        amount_paisa = 799900
        failure_reason = "card_expired"
        cust_id = request.customer_id or f"c_sim_card_{sim_id}"
        cust_name = "Pooja Hegde"
        cust_email = "pooja.hegde@example.com"
        success_rate = 0.85
    elif event_type == "high_value":
        amount_paisa = 1500000  # ₹15,000 -> Exceeds ₹10,000 auto limit
        failure_reason = "insufficient_funds"
        cust_id = request.customer_id or f"c_vip_{sim_id}"
        cust_name = "Rajesh Singhania (VIP)"
        cust_email = "rajesh.singhania@enterprise.in"
        success_rate = 0.98
    elif event_type == "duplicate_webhook":
        amount_paisa = 499900
        failure_reason = "bank_timeout"
        cust_id = request.customer_id or f"c_sim_dup_{sim_id}"
        cust_name = "Ananya Roy"
        cust_email = "ananya.roy@example.com"
        success_rate = 0.88
    else:
        amount_paisa = 499900
        failure_reason = "bank_timeout"
        cust_id = request.customer_id or f"c_sim_{sim_id}"
        cust_name = "Demo Customer"
        cust_email = "demo@example.com"
        success_rate = 0.75

    pid = request.payment_id or f"pay_sim_{event_type}_{sim_id}"

    try:
        # 1. Ensure Customer exists
        if not CustomerRepository.get_customer(cust_id):
            CustomerRepository.create_customer(CustomerCreate(
                name=cust_name,
                email=cust_email,
                phone="+919876543210",
                lifetime_value_paisa=5000000,
                historical_success_rate=success_rate,
                total_transactions_count=12
            ), customer_id=cust_id)

        # 2. Ensure Payment exists in Database
        PaymentRepository.create_payment(PaymentCreate(
            razorpay_payment_id=f"pay_rzp_{sim_id}",
            customer_id=cust_id,
            amount_paisa=amount_paisa,
            currency="INR",
            status="failed",
            payment_method="card",
            failure_reason=failure_reason
        ), payment_id=pid)

        # 3. For duplicate_webhook scenario: verify idempotency filter
        if event_type == "duplicate_webhook":
            fixed_event_id = f"evt_dup_test_{sim_id}"
            
            # Step A: Log initial webhook ingestion
            AuditLogRepository.append_log(AuditLogCreate(
                event_id=fixed_event_id,
                entity_type="payment",
                entity_id=pid,
                actor="WEBHOOK_SIMULATOR",
                action="INITIAL_WEBHOOK_INGESTED",
                details={"status": "ingested", "event_id": fixed_event_id}
            ))

            # Step B: Run the agent workflow for the legitimate first event
            result = recovery_agent.run_recovery_workflow(
                payment_id=pid,
                customer_id=cust_id
            )

            # Step C: Simulate duplicate incoming webhook with identical event_id
            existing_logs = AuditLogRepository.get_logs(limit=100)
            is_duplicate = any(log.event_id == fixed_event_id for log in existing_logs)

            logger.info(f"[SIMULATOR] Duplicate webhook test: Event {fixed_event_id} detected as duplicate: {is_duplicate}")

            return {
                "status": "success",
                "event_type": event_type,
                "idempotency_verified": is_duplicate,
                "duplicate_event_id": fixed_event_id,
                "agent_result": result.model_dump(),
                "agent_execution": result.model_dump()
            }

        # 4. Execute standard autonomous recovery agent workflow
        result = recovery_agent.run_recovery_workflow(
            payment_id=pid,
            customer_id=cust_id
        )

        return {
            "status": "success",
            "event_type": event_type,
            "agent_result": result.model_dump(),
            "agent_execution": result.model_dump()
        }

    except Exception as e:
        logger.error(f"[SIMULATOR ERROR] Failed to simulate event: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
