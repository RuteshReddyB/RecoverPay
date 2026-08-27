import hmac
import hashlib
import re

def mask_email(email: str) -> str:
    """
    Mask email address for privacy compliance / zero data leak standard.
    Example: rutesh.reddy@gmail.com -> r***h@g***l.com
    """
    if not email or "@" not in email:
        return "*****"
    
    parts = email.split("@")
    name = parts[0]
    domain = parts[1]
    
    if len(name) <= 2:
        masked_name = name[0] + "*"
    else:
        masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
        
    domain_parts = domain.split(".")
    masked_domain_parts = []
    for dp in domain_parts:
        if len(dp) <= 2:
            masked_dp = dp[0] + "*"
        else:
            masked_dp = dp[0] + "*" * (len(dp) - 2) + dp[-1]
        masked_domain_parts.append(masked_dp)
        
    return f"{masked_name}@{''.join(masked_domain_parts[:-1])}.{domain_parts[-1]}" if len(domain_parts) > 1 else f"{masked_name}@{masked_domain_parts[0]}"

def mask_phone(phone: str) -> str:
    """
    Mask phone number for privacy compliance.
    Example: +919876543210 -> +91 ***** **210
    """
    if not phone:
        return "**********"
    
    clean = re.sub(r"[^\d+]", "", phone)
    if len(clean) < 10:
        return "**********"
    
    # Keep country code if present and last 3 digits
    visible_end = clean[-3:]
    prefix = clean[:-10] if len(clean) > 10 else ""
    return f"{prefix} ***** **{visible_end}".strip()

def verify_razorpay_signature(payload_body: str, signature: str, secret: str) -> bool:
    """
    Verify Razorpay Webhook signature using constant-time HMAC SHA256 comparison
    to protect against timing attacks.
    """
    if not payload_body or not signature or not secret:
        return False
    
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        payload_body.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)
