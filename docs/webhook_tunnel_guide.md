# Live Razorpay Webhook Tunneling & Production Setup Guide

This guide explains how to connect live Razorpay payment failure webhooks and Meta WhatsApp Business API to your running RecoverPay AI instance.

---

## 1. Exposing Local Backend via ngrok or Cloudflare

### Option A: Using ngrok (Recommended)
1. Install [ngrok](https://ngrok.com/) if not already installed.
2. Expose the RecoverPay AI backend running on port 8010:
   ```bash
   ngrok http 8010
   ```
3. Copy the generated HTTPS Forwarding URL (e.g., `https://abc1-23-45.ngrok-free.app`).

### Option B: Using Cloudflare Tunnels (Zero Install)
```bash
npx cloudflared tunnel --url http://localhost:8010
```

---

## 2. Configuring Razorpay Dashboard Webhooks

1. Log in to your [Razorpay Merchant Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** $\rightarrow$ **Webhooks** $\rightarrow$ **Add New Webhook**.
3. Set the **Webhook URL**:
   ```
   https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks/razorpay
   ```
4. Enter a secure **Secret Key** (e.g., `rec_wh_sec_2026_x89`).
5. Select the following **Active Events**:
   - `payment.failed` *(Primary trigger for Autonomous AI Recovery Agent)*
   - `payment.authorized` *(Trigger for success / mark paid)*
   - `payment_link.paid` *(Trigger for customer link completion)*
6. Click **Save**.

---

## 3. Configuring Environment Variables (`.env`)

Update your local `.env` file with your credentials:

```env
# Razorpay Live / Test API Keys
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=rec_wh_sec_2026_x89

# Meta WhatsApp Business Cloud API (Optional for live WhatsApp dispatch)
WHATSAPP_API_TOKEN=EAAX...
WHATSAPP_PHONE_NUMBER_ID=1092837465...

# Twilio SMS API (Optional for live SMS dispatch)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Google Cloud Firebase Firestore
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
```

---

## 4. End-to-End Live Verification Test

1. In Razorpay Test Mode, create a test checkout or simulated failure.
2. Observe ngrok logs delivering `POST /api/webhooks/razorpay` (`200 OK`).
3. View the RecoverPay AI Dashboard at [http://localhost:5174](http://localhost:5174):
   - The failure immediately registers in the **Recovery Queue**.
   - The **Autonomous Agent** evaluates the failure, predicts recovery probability with XGBoost, validates policy caps, and dispatches the recovery link or triggers human escalation.
   - The event is cryptographically sealed in the **Immutable Audit Trail** with a SHA-256 hash.
