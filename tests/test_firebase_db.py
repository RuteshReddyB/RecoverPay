from backend.schemas.customer import CustomerCreate
from backend.schemas.payment import PaymentCreate
from backend.schemas.recovery import RecoveryAttemptCreate
from backend.schemas.audit import AuditLogCreate
from backend.services.db_service import (
    CustomerRepository,
    PaymentRepository,
    RecoveryAttemptRepository,
    AuditLogRepository,
    PolicyRepository
)

def test_customer_repository_crud():
    c_data = CustomerCreate(
        name="Test Merchant Customer",
        email="testcustomer@example.com",
        phone="+919876543210",
        preferred_payment_method="upi"
    )
    customer = CustomerRepository.create_customer(c_data)
    assert customer.id.startswith("c_")
    assert customer.name == "Test Merchant Customer"

    retrieved = CustomerRepository.get_customer(customer.id)
    assert retrieved is not None
    assert retrieved.email == "testcustomer@example.com"

    # Test metric updates
    updated = CustomerRepository.update_metrics(customer.id, is_success=True, amount_paisa=499900)
    assert updated.total_transactions == 1
    assert updated.successful_transactions == 1
    assert updated.lifetime_value_paisa == 499900

def test_payment_repository():
    p_data = PaymentCreate(
        razorpay_payment_id="pay_test_123",
        razorpay_order_id="order_test_123",
        customer_id="c_test",
        amount_paisa=499900,
        currency="INR",
        status="failed",
        payment_method="upi",
        failure_reason="bank_timeout"
    )
    payment = PaymentRepository.create_payment(p_data)
    assert payment.id.startswith("p_")
    assert payment.amount_paisa == 499900

    at_risk = PaymentRepository.get_at_risk_payments()
    assert len(at_risk) > 0
    assert any(p.id == payment.id for p in at_risk)

def test_audit_log_hashing():
    log_create = AuditLogCreate(
        event_id="evt_1001",
        entity_type="payment",
        entity_id="p_test_123",
        actor="AGENT",
        action="RECOVERY_RETRY_INITIATED",
        details={"action": "RETRY", "probability": 0.84}
    )
    log_entry = AuditLogRepository.append_log(log_create)
    assert log_entry.id.startswith("aud_")
    assert len(log_entry.hash) == 64  # SHA256 hex length
