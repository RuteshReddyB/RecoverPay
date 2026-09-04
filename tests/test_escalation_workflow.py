import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.db_service import PaymentRepository, CustomerRepository
from backend.schemas.payment import PaymentCreate
from backend.schemas.customer import CustomerCreate

client = TestClient(app)

def setup_test_payment(amount_rupees: float = 150000.0, status: str = "failed"):
    customer_id = f"c_test_{uuid.uuid4().hex[:6]}"
    payment_id = f"pay_esc_test_{uuid.uuid4().hex[:6]}"
    
    CustomerRepository.create_customer(CustomerCreate(
        id=customer_id,
        name="VIP Enterprise Client",
        email="vip.client@enterprise.com",
        phone="+919876543210"
    ))
    
    p = PaymentRepository.create_payment(
        PaymentCreate(
            razorpay_payment_id=payment_id,
            customer_id=customer_id,
            amount_paisa=int(amount_rupees * 100),
            status=status,
            payment_method="card",
            failure_reason="bank_timeout"
        ),
        payment_id=payment_id
    )
    
    return p.id

def test_resolve_escalation_manual_retry():
    """Test human operator resolving escalation via manual retry override."""
    payment_id = setup_test_payment(150000.0)
    
    res = client.post(
        f"/api/recovery/escalations/{payment_id}/resolve",
        json={
            "resolution_action": "MANUAL_RETRY",
            "operator_notes": "Spoke to buyer via phone; card limits cleared, approved immediate gateway retry.",
            "resolved_by": "Ops Manager John"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["payment_id"] == payment_id
    assert data["resolution_action"] == "MANUAL_RETRY"
    assert data["new_status"] == "captured"
    assert "audit_log_id" in data

def test_resolve_escalation_send_vip_link():
    """Test human operator resolving escalation by generating VIP concierge payment link."""
    payment_id = setup_test_payment(200000.0)
    
    res = client.post(
        f"/api/recovery/escalations/{payment_id}/resolve",
        json={
            "resolution_action": "SEND_VIP_LINK",
            "operator_notes": "Customer requested high-trust WhatsApp link with 48h validity.",
            "resolved_by": "Senior Agent Priya"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["new_status"] == "link_sent"

def test_resolve_escalation_offline_wire():
    """Test human operator marking payment resolved via offline NEFT/RTGS wire."""
    payment_id = setup_test_payment(500000.0)
    
    res = client.post(
        f"/api/recovery/escalations/{payment_id}/resolve",
        json={
            "resolution_action": "MARK_RESOLVED_OFFLINE",
            "operator_notes": "Received RTGS UTR# HDFC0099821817; funds verified in merchant account.",
            "resolved_by": "Finance Ops"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["new_status"] == "captured"

def test_resolve_escalation_write_off():
    """Test human operator writing off unrecoverable debt."""
    payment_id = setup_test_payment(80000.0)
    
    res = client.post(
        f"/api/recovery/escalations/{payment_id}/resolve",
        json={
            "resolution_action": "WRITE_OFF",
            "operator_notes": "Customer confirmed order cancellation; write off approved.",
            "resolved_by": "Audit Lead"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["new_status"] == "rejected"

def test_resolve_escalation_not_found():
    """Test resolving a non-existent payment returns 404."""
    res = client.post(
        "/api/recovery/escalations/non_existent_pay_id/resolve",
        json={
            "resolution_action": "MANUAL_RETRY",
            "operator_notes": "Testing 404"
        }
    )
    assert res.status_code == 404

def test_resolve_escalation_invalid_action():
    """Test resolving with an invalid action string returns 400."""
    payment_id = setup_test_payment(50000.0)
    
    res = client.post(
        f"/api/recovery/escalations/{payment_id}/resolve",
        json={
            "resolution_action": "INVALID_ACTION_CODE",
            "operator_notes": "Testing 400"
        }
    )
    assert res.status_code == 400
