from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from backend.services.decision_engine import decision_engine
from backend.services.razorpay_service import razorpay_service
from backend.services.db_service import (
    CustomerRepository,
    PaymentRepository,
    RecoveryAttemptRepository,
    AuditLogRepository
)
from backend.schemas.recovery import RecoveryAttemptCreate
from backend.schemas.audit import AuditLogCreate
import uuid

router = APIRouter(prefix="/api/recovery", tags=["Recovery"])

class EvaluateRequest(BaseModel):
    customer_id: Optional[str] = None
    payment_id: Optional[str] = None
    customer_details: Optional[Dict[str, Any]] = None
    payment_details: Optional[Dict[str, Any]] = None

class ExecuteRequest(BaseModel):
    payment_id: str
    action: Optional[str] = None  # If omitted, uses decision engine recommendation

@router.post("/evaluate")
def evaluate_recovery(request: EvaluateRequest):
    customer_data = request.customer_details or {}
    payment_data = request.payment_details or {}

    if request.customer_id:
        c = CustomerRepository.get_customer(request.customer_id)
        if c:
            customer_data.update(c.model_dump())

    if request.payment_id:
        p = PaymentRepository.get_payment(request.payment_id)
        if p:
            payment_data.update(p.model_dump())

    decision = decision_engine.select_best_recovery_action(customer_data, payment_data)
    return {
        "status": "success",
        "decision": decision.model_dump()
    }

@router.post("/execute")
def execute_recovery(request: ExecuteRequest):
    payment = PaymentRepository.get_payment(request.payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    customer = CustomerRepository.get_customer(payment.customer_id)
    customer_data = customer.model_dump() if customer else {}
    payment_data = payment.model_dump()

    # Get decision
    decision = decision_engine.select_best_recovery_action(customer_data, payment_data)
    action_to_execute = request.action or decision.recommended_action

    if decision.policy_status == "BLOCKED" and not request.action:
        raise HTTPException(status_code=400, detail=f"Action blocked by policy: {decision.policy_reason}")

    # Record Attempt
    attempt_create = RecoveryAttemptCreate(
        payment_id=payment.id,
        customer_id=payment.customer_id,
        action=action_to_execute,
        predicted_probability=decision.probability,
        expected_recovery_paisa=decision.expected_recovery_paisa,
        policy_status=decision.policy_status,
        policy_reason=decision.policy_reason
    )
    attempt = RecoveryAttemptRepository.create_attempt(attempt_create)

    # Execute Razorpay Action
    execution_res = {}
    if action_to_execute == "PAYMENT_LINK":
        execution_res = razorpay_service.create_payment_link(
            amount_paisa=payment.amount_paisa,
            customer_name=customer_data.get("name", "Customer"),
            customer_email=customer_data.get("email", "customer@example.com"),
            customer_phone=customer_data.get("phone", "+919876543210")
        )
        RecoveryAttemptRepository.update_outcome(
            attempt_id=attempt.id,
            execution_status="SUCCESS",
            amount_recovered_paisa=0,  # Will be recovered when customer pays link
            reference_id=execution_res.get("payment_link_id")
        )
        PaymentRepository.update_payment_status(payment.id, "link_sent")

    elif action_to_execute == "RETRY":
        execution_res = razorpay_service.retry_payment(payment.razorpay_payment_id)
        # Simulate payment retry outcome based on decision probability
        import random
        is_success = random.random() < decision.probability
        if is_success:
            RecoveryAttemptRepository.update_outcome(
                attempt_id=attempt.id,
                execution_status="SUCCESS",
                amount_recovered_paisa=payment.amount_paisa,
                reference_id=execution_res.get("retry_id")
            )
            PaymentRepository.update_payment_status(payment.id, "captured")
            CustomerRepository.update_metrics(payment.customer_id, is_success=True, amount_paisa=payment.amount_paisa)
        else:
            RecoveryAttemptRepository.update_outcome(
                attempt_id=attempt.id,
                execution_status="FAILED",
                amount_recovered_paisa=0,
                reference_id=execution_res.get("retry_id")
            )

    elif action_to_execute in ["REMINDER", "SCHEDULE_FOLLOWUP"]:
        execution_res = razorpay_service.send_payment_reminder(
            customer_email=customer_data.get("email", "customer@example.com"),
            customer_phone=customer_data.get("phone", "+919876543210"),
            payment_link_url="https://rzp.io/i/test_reminder"
        )
        RecoveryAttemptRepository.update_outcome(
            attempt_id=attempt.id,
            execution_status="SUCCESS",
            amount_recovered_paisa=0,
            reference_id=execution_res.get("status")
        )

    else: # HUMAN_ESCALATION
        RecoveryAttemptRepository.update_outcome(
            attempt_id=attempt.id,
            execution_status="ESCALATED",
            amount_recovered_paisa=0
        )
        execution_res = {"status": "escalated_to_human", "reason": decision.policy_reason}

    # Append Audit Log
    AuditLogRepository.append_log(AuditLogCreate(
        event_id=f"evt_exec_{uuid.uuid4().hex[:8]}",
        entity_type="recovery_attempt",
        entity_id=attempt.id,
        actor="AGENT",
        action=f"RECOVERY_ACTION_EXECUTED_{action_to_execute}",
        details={
            "payment_id": payment.id,
            "action": action_to_execute,
            "policy_status": decision.policy_status,
            "execution_result": execution_res
        }
    ))

    return {
        "status": "success",
        "attempt_id": attempt.id,
        "action": action_to_execute,
        "policy_status": decision.policy_status,
        "execution_result": execution_res
    }

@router.get("/queue")
def get_recovery_queue():
    at_risk = PaymentRepository.get_at_risk_payments()
    queue_items = []
    escalations = []

    for pmt in at_risk:
        c = CustomerRepository.get_customer(pmt.customer_id)
        c_dict = c.model_dump() if c else {}
        decision = decision_engine.select_best_recovery_action(c_dict, pmt.model_dump())
        
        item = {
            "payment_id": pmt.id,
            "razorpay_payment_id": pmt.razorpay_payment_id,
            "customer_id": pmt.customer_id,
            "customer_name": c_dict.get("name", "Unknown"),
            "amount_paisa": pmt.amount_paisa,
            "amount_rupees": pmt.amount_rupees,
            "failure_reason": pmt.failure_reason,
            "recommended_action": decision.recommended_action,
            "probability_pct": decision.probability_pct,
            "expected_recovery_rupees": decision.expected_recovery_rupees,
            "policy_status": "LINK_SENT" if pmt.status == "link_sent" else decision.policy_status,
            "policy_reason": decision.policy_reason,
            "status": "LINK_SENT" if pmt.status == "link_sent" else ("READY" if decision.policy_status == "APPROVED" else decision.policy_status)
        }

        if decision.policy_status == "HUMAN_ESCALATION":
            escalations.append(item)
        else:
            queue_items.append(item)

    return {
        "status": "success",
        "active_cases_count": len(queue_items),
        "escalations_count": len(escalations),
        "recovery_queue": queue_items,
        "escalations_queue": escalations
    }

@router.get("/audit-logs")
def get_audit_logs(limit: int = 50):
    logs = AuditLogRepository.get_logs(limit=limit)
    return {
        "status": "success",
        "count": len(logs),
        "logs": [log.model_dump() for log in logs]
    }
