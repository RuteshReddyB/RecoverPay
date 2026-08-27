import uuid
import datetime
from typing import List, Optional, Dict, Any
from backend.db.firebase import get_db
from backend.schemas.customer import CustomerSchema, CustomerCreate, CustomerPublicSchema
from backend.schemas.payment import PaymentSchema, PaymentCreate
from backend.schemas.recovery import RecoveryAttemptSchema, RecoveryAttemptCreate
from backend.schemas.policy import MerchantPolicySchema
from backend.schemas.audit import AuditLogSchema, AuditLogCreate
from backend.utils.logger import logger

class CustomerRepository:
    @staticmethod
    def create_customer(customer_data: CustomerCreate, customer_id: Optional[str] = None) -> CustomerSchema:
        db, _ = get_db()
        cid = customer_id or f"c_{uuid.uuid4().hex[:8]}"
        doc_data = {
            "id": cid,
            "name": customer_data.name,
            "email": customer_data.email,
            "phone": customer_data.phone,
            "preferred_payment_method": customer_data.preferred_payment_method,
            "lifetime_value_paisa": 0,
            "total_transactions": 0,
            "successful_transactions": 0,
            "failed_transactions": 0,
            "historical_success_rate": 1.0,
            "risk_score": 0.0,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        db.collection("customers").document(cid).set(doc_data)
        return CustomerSchema(**doc_data)

    @staticmethod
    def get_customer(customer_id: str) -> Optional[CustomerSchema]:
        db, _ = get_db()
        doc = db.collection("customers").document(customer_id).get()
        if doc.exists:
            return CustomerSchema(**doc.to_dict())
        return None

    @staticmethod
    def update_metrics(customer_id: str, is_success: bool, amount_paisa: int) -> Optional[CustomerSchema]:
        db, _ = get_db()
        doc_ref = db.collection("customers").document(customer_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        data["total_transactions"] += 1
        if is_success:
            data["successful_transactions"] += 1
            data["lifetime_value_paisa"] += amount_paisa
        else:
            data["failed_transactions"] += 1

        total = data["total_transactions"]
        successes = data["successful_transactions"]
        data["historical_success_rate"] = round(successes / total, 4) if total > 0 else 1.0

        doc_ref.set(data, merge=True)
        return CustomerSchema(**data)

class PaymentRepository:
    @staticmethod
    def create_payment(payment_data: PaymentCreate, payment_id: Optional[str] = None) -> PaymentSchema:
        db, _ = get_db()
        pid = payment_id or f"p_{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        doc_data = {
            "id": pid,
            "razorpay_payment_id": payment_data.razorpay_payment_id,
            "razorpay_order_id": payment_data.razorpay_order_id,
            "customer_id": payment_data.customer_id,
            "amount_paisa": payment_data.amount_paisa,
            "currency": payment_data.currency,
            "status": payment_data.status,
            "payment_method": payment_data.payment_method,
            "failure_reason": payment_data.failure_reason,
            "failure_code": payment_data.failure_code,
            "created_at": now
        }
        db.collection("payments").document(pid).set(doc_data)
        return PaymentSchema(**doc_data)

    @staticmethod
    def get_payment(payment_id: str) -> Optional[PaymentSchema]:
        db, _ = get_db()
        doc = db.collection("payments").document(payment_id).get()
        if doc.exists:
            return PaymentSchema(**doc.to_dict())
        return None

    @staticmethod
    def get_at_risk_payments() -> List[PaymentSchema]:
        db, _ = get_db()
        docs_failed = db.collection("payments").where("status", "==", "failed").stream()
        docs_link = db.collection("payments").where("status", "==", "link_sent").stream()
        payments = [PaymentSchema(**d.to_dict()) for d in docs_failed]
        payments.extend([PaymentSchema(**d.to_dict()) for d in docs_link])
        return payments

    @staticmethod
    def update_payment_status(payment_id: str, status: str) -> Optional[PaymentSchema]:
        db, _ = get_db()
        doc_ref = db.collection("payments").document(payment_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["status"] = status
        doc_ref.set(data, merge=True)
        return PaymentSchema(**data)

class RecoveryAttemptRepository:
    @staticmethod
    def create_attempt(attempt_data: RecoveryAttemptCreate) -> RecoveryAttemptSchema:
        db, _ = get_db()
        aid = f"rec_{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        doc_data = {
            "id": aid,
            "payment_id": attempt_data.payment_id,
            "customer_id": attempt_data.customer_id,
            "action": attempt_data.action,
            "predicted_probability": attempt_data.predicted_probability,
            "expected_recovery_paisa": attempt_data.expected_recovery_paisa,
            "policy_status": attempt_data.policy_status,
            "policy_reason": attempt_data.policy_reason,
            "execution_status": "PENDING",
            "amount_recovered_paisa": 0,
            "razorpay_action_reference_id": None,
            "executed_at": now,
            "completed_at": None
        }
        db.collection("recovery_attempts").document(aid).set(doc_data)
        return RecoveryAttemptSchema(**doc_data)

    @staticmethod
    def update_outcome(attempt_id: str, execution_status: str, amount_recovered_paisa: int = 0, reference_id: Optional[str] = None) -> Optional[RecoveryAttemptSchema]:
        db, _ = get_db()
        doc_ref = db.collection("recovery_attempts").document(attempt_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["execution_status"] = execution_status
        data["amount_recovered_paisa"] = amount_recovered_paisa
        if reference_id:
            data["razorpay_action_reference_id"] = reference_id
        data["completed_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        doc_ref.set(data, merge=True)
        return RecoveryAttemptSchema(**data)

    @staticmethod
    def get_attempts_for_payment(payment_id: str) -> List[RecoveryAttemptSchema]:
        db, _ = get_db()
        docs = db.collection("recovery_attempts").where("payment_id", "==", payment_id).stream()
        return [RecoveryAttemptSchema(**d.to_dict()) for d in docs]

class AuditLogRepository:
    @staticmethod
    def append_log(log_create: AuditLogCreate) -> AuditLogSchema:
        db, _ = get_db()
        log_id = f"aud_{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Calculate SHA256 signature for tamper-resistance
        log_hash = AuditLogSchema.generate_hash(
            event_id=log_create.event_id,
            actor=log_create.actor,
            action=log_create.action,
            details=log_create.details,
            timestamp=now
        )
        
        doc_data = {
            "id": log_id,
            "event_id": log_create.event_id,
            "entity_type": log_create.entity_type,
            "entity_id": log_create.entity_id,
            "actor": log_create.actor,
            "action": log_create.action,
            "details": log_create.details,
            "hash": log_hash,
            "timestamp": now
        }
        db.collection("audit_logs").document(log_id).set(doc_data)
        logger.info(f"[AUDIT] {log_create.actor} -> {log_create.action} (Entity: {log_create.entity_id})")
        return AuditLogSchema(**doc_data)

    @staticmethod
    def get_logs(limit: int = 50) -> List[AuditLogSchema]:
        db, _ = get_db()
        try:
            from google.cloud.firestore import Query
            docs = db.collection("audit_logs").order_by("timestamp", direction=Query.DESCENDING).stream()
        except Exception:
            docs = db.collection("audit_logs").stream()

        logs = [AuditLogSchema(**d.to_dict()) for d in docs]
        logs.sort(key=lambda x: x.timestamp, reverse=True)
        return logs[:limit]

class PolicyRepository:
    @staticmethod
    def get_policy() -> MerchantPolicySchema:
        db, _ = get_db()
        doc = db.collection("merchant_policies").document("default_policy").get()
        if doc.exists:
            return MerchantPolicySchema(**doc.to_dict())
        
        # Initialize default policy if none exists
        default_pol = MerchantPolicySchema()
        db.collection("merchant_policies").document("default_policy").set(default_pol.model_dump())
        return default_pol

    @staticmethod
    def update_policy(policy_data: MerchantPolicySchema) -> MerchantPolicySchema:
        db, _ = get_db()
        db.collection("merchant_policies").document("default_policy").set(policy_data.model_dump())
        return policy_data
