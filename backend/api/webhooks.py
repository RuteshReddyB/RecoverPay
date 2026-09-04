import json
from fastapi import APIRouter, Request, Header, HTTPException
from backend.config import settings
from backend.utils.security import verify_razorpay_signature
from backend.services.db_service import AuditLogRepository, PaymentRepository, CustomerRepository, RecoveryAttemptRepository
from backend.schemas.audit import AuditLogCreate
from backend.schemas.payment import PaymentCreate
from backend.schemas.recovery import RecoveryAttemptCreate
from backend.services.decision_engine import decision_engine
from backend.services.razorpay_service import razorpay_service
from backend.utils.logger import logger

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

@router.post("/razorpay")
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(default="")
):
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")
    
    # 1. Verify Razorpay Signature (if secret is configured)
    if settings.RAZORPAY_WEBHOOK_SECRET and not settings.RAZORPAY_WEBHOOK_SECRET.startswith("webhooksecret"):
        if not verify_razorpay_signature(body_str, x_razorpay_signature, settings.RAZORPAY_WEBHOOK_SECRET):
            logger.warning("[WEBHOOK] Invalid Razorpay webhook signature detected.")
            raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        payload = json.loads(body_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_id = payload.get("event_id") or payload.get("id") or f"evt_{hash(body_str)}"
    event_type = payload.get("event", "payment.failed")
    
    # 2. Strict Idempotency Check: Reject duplicate webhooks
    existing_logs = AuditLogRepository.get_logs(limit=100)
    if any(log.event_id == event_id for log in existing_logs):
        logger.info(f"[WEBHOOK IDEMPOTENCY] Duplicate event {event_id} ignored.")
        return {
            "status": "ignored_duplicate",
            "event_id": event_id,
            "message": "Event already processed cleanly."
        }

    logger.info(f"[WEBHOOK INGESTION] Processing event {event_type} ({event_id})")

    # Handle Successful Customer Payment (Payment Captured / Payment Link Paid)
    if event_type in ["payment.captured", "payment_link.paid", "order.paid"]:
        entity = (
            payload.get("payload", {}).get("payment", {}).get("entity")
            or payload.get("payload", {}).get("payment_link", {}).get("entity")
            or payload.get("payload", {}).get("order", {}).get("entity", {})
        )
        razorpay_payment_id = entity.get("id") or entity.get("payment_id") or "pay_captured_webhook"
        amount_paisa = entity.get("amount", 499900)
        
        # Locate existing payment record in DB
        payment = PaymentRepository.get_payment(razorpay_payment_id)
        if payment:
            PaymentRepository.update_payment_status(payment.id, "captured")
            CustomerRepository.update_metrics(payment.customer_id, is_success=True, amount_paisa=amount_paisa)
            pid = payment.id
        else:
            pid = razorpay_payment_id

        AuditLogRepository.append_log(AuditLogCreate(
            event_id=event_id,
            entity_type="payment",
            entity_id=pid,
            actor="RAZORPAY_WEBHOOK",
            action=f"PAYMENT_SUCCESSFULLY_CAPTURED_{event_type.upper()}",
            details={
                "razorpay_payment_id": razorpay_payment_id,
                "amount_paisa": amount_paisa,
                "status": "captured",
                "event_type": event_type
            }
        ))
        
        logger.info(f"[WEBHOOK SUCCESS] Payment {pid} marked as captured and recovered.")
        return {
            "status": "processed",
            "event_type": event_type,
            "payment_id": pid,
            "message": "Payment captured and recovered successfully."
        }

    # Extract payment entity for payment.failed
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    razorpay_payment_id = entity.get("id", "pay_webhook_test")
    amount_paisa = entity.get("amount", 499900)
    customer_id = entity.get("customer_id") or "c_webhook_demo"
    failure_reason = entity.get("error_reason", "bank_timeout")

    # Save payment record in DB
    payment_create = PaymentCreate(
        razorpay_payment_id=razorpay_payment_id,
        customer_id=customer_id,
        amount_paisa=amount_paisa,
        status="failed",
        payment_method=entity.get("method", "card"),
        failure_reason=failure_reason
    )
    payment = PaymentRepository.create_payment(payment_create)

    # Fetch/create customer
    customer = CustomerRepository.get_customer(customer_id)
    if not customer:
        from backend.schemas.customer import CustomerCreate
        c_create = CustomerCreate(
            name=entity.get("notes", {}).get("name", "Webhook Customer"),
            email=entity.get("email", "customer@example.com"),
            phone=entity.get("contact", "+919876543210")
        )
        customer = CustomerRepository.create_customer(c_create, customer_id=customer_id)

    # 3. Trigger Autonomous Recovery Decision Engine
    decision = decision_engine.select_best_recovery_action(
        customer_dict=customer.model_dump(),
        payment_dict=payment.model_dump()
    )

    execution_res = {}
    execution_status = "PENDING"

    # 4. If policy APPROVES, execute autonomously right now
    if decision.policy_status == "APPROVED":
        try:
            if decision.recommended_action == "PAYMENT_LINK":
                execution_res = razorpay_service.create_payment_link(
                    amount_paisa=payment.amount_paisa,
                    customer_name=getattr(customer, "name", "Customer"),
                    customer_email=getattr(customer, "email", "customer@example.com"),
                    customer_phone=getattr(customer, "phone", "+919876543210")
                )
                PaymentRepository.update_payment_status(payment.id, "link_sent")
                execution_status = "EXECUTED_PAYMENT_LINK"

            elif decision.recommended_action == "RETRY":
                execution_res = razorpay_service.retry_payment(
                    razorpay_payment_id=payment.razorpay_payment_id
                )
                execution_status = "EXECUTED_RETRY"

            elif decision.recommended_action in ["REMINDER", "SCHEDULE_FOLLOWUP"]:
                execution_res = razorpay_service.send_payment_reminder(
                    customer_email=getattr(customer, "email", "customer@example.com"),
                    customer_phone=getattr(customer, "phone", "+919876543210"),
                    payment_link_url="https://rzp.io/i/webhook_recovery"
                )
                execution_status = "EXECUTED_REMINDER"

            # Record recovery attempt
            attempt_create = RecoveryAttemptCreate(
                payment_id=payment.id,
                customer_id=payment.customer_id,
                action=decision.recommended_action,
                predicted_probability=decision.probability,
                expected_recovery_paisa=decision.expected_recovery_paisa,
                policy_status=decision.policy_status,
                policy_reason=decision.policy_reason
            )
            RecoveryAttemptRepository.create_attempt(attempt_create)
            logger.info(
                f"[WEBHOOK AUTO-EXECUTE] Action '{decision.recommended_action}' dispatched for payment {payment.id}. "
                f"Status: {execution_status}"
            )

        except Exception as e:
            logger.error(f"[WEBHOOK EXECUTION ERROR] Failed to execute '{decision.recommended_action}': {e}")
            execution_status = "EXECUTION_FAILED"
            execution_res = {"error": str(e)}

    elif decision.policy_status == "HUMAN_ESCALATION":
        execution_status = "ESCALATED_TO_HUMAN"
        logger.info(f"[WEBHOOK] Payment {payment.id} requires human review: {decision.policy_reason}")
    else:
        execution_status = "BLOCKED_BY_POLICY"
        logger.info(f"[WEBHOOK] Payment {payment.id} blocked by policy: {decision.policy_reason}")

    # 5. Log Immutable Audit Record
    AuditLogRepository.append_log(AuditLogCreate(
        event_id=event_id,
        entity_type="payment",
        entity_id=payment.id,
        actor="WEBHOOK",
        action=f"PAYMENT_FAILURE_INGESTED_{event_type.upper()}",
        details={
            "razorpay_payment_id": razorpay_payment_id,
            "amount_paisa": amount_paisa,
            "failure_reason": failure_reason,
            "recommended_action": decision.recommended_action,
            "policy_status": decision.policy_status,
            "execution_status": execution_status,
            "execution_result": execution_res
        }
    ))

    return {
        "status": "processed",
        "event_id": event_id,
        "payment_id": payment.id,
        "recommended_action": decision.recommended_action,
        "policy_status": decision.policy_status,
        "execution_status": execution_status,
        "expected_recovery_rupees": decision.expected_recovery_rupees,
        "execution_result": execution_res
    }
