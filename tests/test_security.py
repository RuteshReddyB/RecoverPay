from backend.utils.security import mask_email, mask_phone, verify_razorpay_signature

def test_mask_email():
    assert mask_email("rutesh.reddy@gmail.com") == "r**********y@g***l.com"
    assert mask_email("user@test.co") == "u**r@t**t.co"
    assert mask_email("a@b.com") == "a*@b*.com"

def test_mask_phone():
    assert mask_phone("+919876543210") == "+91 ***** **210"
    assert mask_phone("9876543210") == "***** **210"

def test_verify_razorpay_signature():
    secret = "test_webhook_secret"
    payload = '{"event":"payment.failed"}'
    
    # Calculate valid signature
    import hmac
    import hashlib
    valid_sig = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    assert verify_razorpay_signature(payload, valid_sig, secret) is True
    assert verify_razorpay_signature(payload, "invalid_sig", secret) is False
