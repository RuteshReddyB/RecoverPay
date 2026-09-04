import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.report_generator import generate_executive_pdf_report
from backend.services.notification_service import NotificationService
from backend.services.cloud_db_validator import validate_cloud_firestore_connection

client = TestClient(app)

def test_executive_pdf_report_generation():
    """Verify server-side ReportLab PDF document compilation."""
    pdf_bytes = generate_executive_pdf_report()
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

def test_export_pdf_endpoint():
    """Verify GET /api/analytics/export-pdf returns valid PDF stream with attachment headers."""
    response = client.get("/api/analytics/export-pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers.get("content-disposition", "")
    assert response.content.startswith(b"%PDF")

def test_auth_login_admin():
    """Verify POST /api/auth/login generates valid JWT and user payload for Merchant Admin."""
    response = client.post("/api/auth/login", json={"role_key": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "token" in data
    assert data["user"]["role"] == "MERCHANT_ADMIN"
    assert "POLICY_EDIT" in data["user"]["permissions"]

def test_auth_login_operator():
    """Verify POST /api/auth/login for Operations Lead."""
    response = client.post("/api/auth/login", json={"role_key": "operator"})
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "OPERATIONS_LEAD"
    assert "ESCALATION_RESOLVE" in data["user"]["permissions"]

def test_auth_login_auditor():
    """Verify POST /api/auth/login for Compliance Auditor."""
    response = client.post("/api/auth/login", json={"role_key": "auditor"})
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "COMPLIANCE_AUDITOR"
    assert "VIEW_AUDIT" in data["user"]["permissions"]

def test_auth_get_roles():
    """Verify GET /api/auth/roles returns all 3 distinct enterprise personas."""
    response = client.get("/api/auth/roles")
    assert response.status_code == 200
    roles = response.json().get("roles", [])
    assert len(roles) == 3
    role_names = [r["role"] for r in roles]
    assert "MERCHANT_ADMIN" in role_names
    assert "OPERATIONS_LEAD" in role_names
    assert "COMPLIANCE_AUDITOR" in role_names

def test_notification_service_whatsapp_simulated():
    """Verify WhatsApp dispatch with simulated sandbox audit log."""
    res = NotificationService.send_whatsapp_message(
        phone_number="+919876543210",
        customer_name="Rohan Sharma",
        amount_rupees=4999.0,
        payment_link="https://rzp.io/i/test",
        failure_reason="bank_timeout",
        payment_id="pay_test_notif_001"
    )
    assert res["status"] == "success"
    assert res["channel"] == "WHATSAPP"
    assert "wamid" in res["dispatch_id"]

def test_notification_service_sms_simulated():
    """Verify SMS dispatch with simulated sandbox audit log."""
    res = NotificationService.send_sms(
        phone_number="+919876543210",
        customer_name="Rohan Sharma",
        amount_rupees=4999.0,
        payment_link="https://rzp.io/i/test",
        failure_reason="bank_timeout",
        payment_id="pay_test_notif_002"
    )
    assert res["status"] == "success"
    assert res["channel"] == "SMS"
    assert "SM" in res["dispatch_id"]

def test_cloud_db_validator():
    """Verify diagnostic cloud credentials verification tool."""
    res = validate_cloud_firestore_connection()
    assert res["status"] in ["success", "warning"]
    assert "mode" in res
