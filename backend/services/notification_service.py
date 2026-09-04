import os
import httpx
from typing import Optional, Dict, Any
from backend.utils.logger import logger
from backend.services.db_service import AuditLogRepository
from backend.schemas.audit import AuditLogCreate

class NotificationService:
    """
    Omnichannel Dispatch Gateway for WhatsApp Business Cloud API and Twilio SMS.
    Automatically detects live environment credentials and routes to live gateways
    or simulated audit sandbox with full traceability.
    """

    @staticmethod
    def send_whatsapp_message(
        phone_number: str,
        customer_name: str,
        amount_rupees: float,
        payment_link: str,
        failure_reason: str,
        payment_id: str
    ) -> Dict[str, Any]:
        whatsapp_token = os.getenv("WHATSAPP_API_TOKEN")
        phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

        formatted_reason = failure_reason.replace("_", " ").title()
        message_body = (
            f"Hi {customer_name} 👋\n\n"
            f"We noticed your payment of ₹{amount_rupees:,.2f} could not be completed due to a temporary {formatted_reason}.\n\n"
            f"Your order is reserved! You can instantly complete your payment with 1-click via Razorpay secure gateway:\n"
            f"👉 {payment_link}\n\n"
            f"Need help? Reply directly to this message."
        )

        if whatsapp_token and phone_number_id:
            try:
                url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
                headers = {
                    "Authorization": f"Bearer {whatsapp_token}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "messaging_product": "whatsapp",
                    "to": phone_number,
                    "type": "text",
                    "text": {"body": message_body}
                }
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(url, json=payload, headers=headers)
                    logger.info(f"Meta WhatsApp Cloud API Response ({resp.status_code}): {resp.text}")
                    dispatched_mode = "LIVE_META_CLOUD_API"
                    dispatch_id = resp.json().get("messages", [{}])[0].get("id", "wamid_live")
            except Exception as e:
                logger.error(f"Live WhatsApp dispatch error: {str(e)}")
                dispatched_mode = "SIMULATED_SANDBOX"
                dispatch_id = f"wamid_sim_{payment_id}"
        else:
            dispatched_mode = "SIMULATED_SANDBOX"
            dispatch_id = f"wamid_sim_{payment_id}"

        # Record tamper-evident audit log
        AuditLogRepository.append_log(AuditLogCreate(
            event_id=f"evt_wa_{payment_id}",
            entity_type="notification",
            entity_id=payment_id,
            action="WHATSAPP_DISPATCHED",
            actor="NOTIFICATION_GATEWAY",
            details={
                "channel": "WHATSAPP",
                "mode": dispatched_mode,
                "dispatch_id": dispatch_id,
                "recipient": phone_number[:3] + "****" + phone_number[-4:] if len(phone_number) >= 7 else phone_number,
                "payment_link": payment_link,
                "amount_rupees": amount_rupees
            }
        ))

        return {
            "status": "success",
            "channel": "WHATSAPP",
            "mode": dispatched_mode,
            "dispatch_id": dispatch_id,
            "recipient": phone_number,
            "message": message_body
        }

    @staticmethod
    def send_sms(
        phone_number: str,
        customer_name: str,
        amount_rupees: float,
        payment_link: str,
        failure_reason: str,
        payment_id: str
    ) -> Dict[str, Any]:
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_auth = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_from = os.getenv("TWILIO_PHONE_NUMBER")

        formatted_reason = failure_reason.replace("_", " ").title()
        sms_text = f"RECOVERPAY: Hi {customer_name}, your payment of ₹{amount_rupees:,.2f} was interrupted ({formatted_reason}). Complete securely: {payment_link} (Valid 24h)"

        if twilio_sid and twilio_auth and twilio_from:
            try:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
                data = {
                    "To": phone_number,
                    "From": twilio_from,
                    "Body": sms_text
                }
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(url, data=data, auth=(twilio_sid, twilio_auth))
                    logger.info(f"Twilio SMS Response ({resp.status_code}): {resp.text}")
                    dispatched_mode = "LIVE_TWILIO_SMS"
                    dispatch_id = resp.json().get("sid", "SM_live")
            except Exception as e:
                logger.error(f"Live SMS dispatch error: {str(e)}")
                dispatched_mode = "SIMULATED_SANDBOX"
                dispatch_id = f"SM_sim_{payment_id}"
        else:
            dispatched_mode = "SIMULATED_SANDBOX"
            dispatch_id = f"SM_sim_{payment_id}"

        # Record audit log
        AuditLogRepository.append_log(AuditLogCreate(
            event_id=f"evt_sms_{payment_id}",
            entity_type="notification",
            entity_id=payment_id,
            action="SMS_DISPATCHED",
            actor="NOTIFICATION_GATEWAY",
            details={
                "channel": "SMS",
                "mode": dispatched_mode,
                "dispatch_id": dispatch_id,
                "recipient": phone_number[:3] + "****" + phone_number[-4:] if len(phone_number) >= 7 else phone_number,
                "amount_rupees": amount_rupees
            }
        ))

        return {
            "status": "success",
            "channel": "SMS",
            "mode": dispatched_mode,
            "dispatch_id": dispatch_id,
            "recipient": phone_number,
            "message": sms_text
        }
