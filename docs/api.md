# REST API Reference Specification — RecoverPay AI

Base URL: `http://127.0.0.1:8000`

---

## 1. System Health

### `GET /api/health`
Checks backend service health, Firebase Firestore connection state, and active merchant policy parameters.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-25T18:30:00+00:00",
  "database": {
    "type": "Firebase Firestore",
    "mock_mode": false,
    "connected": true
  },
  "environment": "development",
  "default_policies": {
    "max_auto_recovery_amount_paisa": 1000000,
    "max_auto_recovery_amount_rupees": 10000.0,
    "max_retry_attempts": 2,
    "min_recovery_probability": 0.4,
    "auto_recovery_enabled": true
  }
}
```

---

## 2. Autonomous Agent Endpoints

### `POST /api/agent/run`
Triggers full autonomous agent tool calling workflow on a payment failure event.

**Request Body**:
```json
{
  "payment_id": "pay_demo_101",
  "customer_id": "c_demo_101"
}
```

**Response `200 OK`**:
```json
{
  "status": "success",
  "agent_execution": {
    "payment_id": "pay_demo_101",
    "status": "completed",
    "recommended_action": "RETRY",
    "policy_status": "APPROVED",
    "expected_recovery_rupees": 4249.15,
    "probability_pct": 85.0,
    "reasoning_trace": [
      {
        "step_index": 1,
        "tool_name": "get_payment_details",
        "reasoning": "Step 1 (Detect): Retrieved payment record. Amount = ₹4,999.00..."
      },
      {
        "step_index": 2,
        "tool_name": "get_customer_history",
        "reasoning": "Step 2 (Diagnose): Analyzed customer profile..."
      },
      {
        "step_index": 3,
        "tool_name": "predict_recovery_probability",
        "reasoning": "Step 3 (Predict): Ran XGBoost probability model..."
      },
      {
        "step_index": 4,
        "tool_name": "calculate_expected_recovery",
        "reasoning": "Step 4 (Decide): Calculated Expected Recovery Value..."
      },
      {
        "step_index": 5,
        "tool_name": "validate_policy",
        "reasoning": "Step 5 (Policy Engine): Policy check status = 'APPROVED'..."
      },
      {
        "step_index": 6,
        "tool_name": "execute_razorpay_action",
        "reasoning": "Step 6 (Execute): Dispatched Razorpay action 'RETRY'..."
      },
      {
        "step_index": 7,
        "tool_name": "record_outcome",
        "reasoning": "Step 7 (Audit): Appended immutable audit log event..."
      }
    ]
  }
}
```

### `GET /api/agent/tools`
Lists all 8 structured agent tool manifest definitions and OpenAPI docstrings.

---

## 3. Webhook Integration Endpoints

### `POST /api/webhooks/razorpay`
Ingests payment webhooks from Razorpay with HMAC SHA256 signature verification and idempotency filtering.

**Headers**:
- `X-Razorpay-Signature`: HMAC SHA256 signature hash

**Request Body**:
```json
{
  "event": "payment.failed",
  "event_id": "evt_rzp_1001",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_rzp_1001",
        "amount": 499900,
        "status": "failed",
        "method": "card",
        "error_code": "BAD_REQUEST_ERROR",
        "error_reason": "bank_timeout"
      }
    }
  }
}
```

---

## 4. Analytics & Benchmark Endpoints

### `GET /api/analytics/benchmark`
Returns comparative 1,000-event evaluation report (Baseline vs RecoverPay AI).

### `GET /api/analytics/funnel`
Returns Revenue Funnel stages: Revenue at Risk $\rightarrow$ Eligible $\rightarrow$ Executed $\rightarrow$ Recovered.

### `GET /api/analytics/overview`
Returns top summary KPI cards for the merchant dashboard.
