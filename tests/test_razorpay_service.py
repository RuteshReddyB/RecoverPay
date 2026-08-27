from backend.services.razorpay_service import razorpay_service

def test_create_payment_link():
    res = razorpay_service.create_payment_link(
        amount_paisa=499900,
        customer_name="Test User",
        customer_email="testuser@example.com"
    )
    assert res["status"] == "success"
    assert "payment_link_id" in res
    assert "short_url" in res
    assert res["amount_paisa"] == 499900

def test_retry_payment():
    res = razorpay_service.retry_payment("pay_test_123")
    assert res["status"] == "initiated"
    assert res["razorpay_payment_id"] == "pay_test_123"

def test_send_payment_reminder():
    res = razorpay_service.send_payment_reminder(
        customer_email="testuser@example.com",
        customer_phone="+919876543210",
        payment_link_url="https://rzp.io/i/test"
    )
    assert res["status"] == "dispatched"
    assert "sms" in res["channels"]
