# Architecture Specification — RecoverPay AI

## 1. System Topology

RecoverPay AI uses a decoupled, event-driven microservices architecture built for high throughput, low latency, and zero financial calculation error.

```text
               ┌──────────────────────────────────────────────┐
               │    Razorpay Merchant Payment Gateway         │
               └──────────────────────┬───────────────────────┘
                                      │ Webhook (payment.failed)
                                      ▼
               ┌──────────────────────────────────────────────┐
               │        FastAPI Webhook Receiver              │
               │   - HMAC SHA-256 Signature Verification    │
               │   - Event ID Idempotency Rejection           │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │        Autonomous Recovery Agent             │
               │   (Dual Runner: LLM / Tool Orchestrator)     │
               └──────────────────────┬───────────────────────┘
                                      │ Tool Invocations
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│ ML Predictor  │             │ Policy Engine │             │ Razorpay SDK  │
│ (XGBoost)     │             │ (Hard Limits) │             │ (Test APIs)   │
└───────┬───────┘             └───────┬───────┘             └───────┬───────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │   Firebase Firestore / Audit Log Repository   │
               │   - SHA-256 Event Checksum Hashing           │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │   React + TypeScript Fintech Control Center  │
               │   - Light Grey / Dark Mode Switcher          │
               │   - 7-Step AI Reasoning Trace Viewer       │
               │   - Live Event Simulator                     │
               └──────────────────────────────────────────────┘
```

---

## 2. 8 Structured Agent Tools

The autonomous agent interacts exclusively through typed tool functions:

| Tool Name | Input Parameters | Output Return | Primary Purpose |
| :--- | :--- | :--- | :--- |
| `get_payment_details` | `payment_id: str` | Payment record (Amount, Failure cause) | Fetch payment failure context |
| `get_customer_history` | `customer_id: str` | Customer profile (LTV, Success rate) | Fetch customer behavioral profile |
| `predict_recovery_probability` | `customer_id, payment_id, action` | $P(\text{success} \mid \text{action})$ % | ML probability inference |
| `calculate_expected_recovery` | `amount_paisa, probability` | Expected Value (Paisa & Rupees) | Financial value calculation |
| `validate_policy` | `action, amount, prob, retries` | Policy check result (APPROVED/BLOCKED) | Enforce merchant safety rules |
| `execute_razorpay_action` | `payment_id, action` | API dispatch result | Execute Payment Link / Retry / SMS |
| `escalate_to_human` | `payment_id, reason` | Escalation payload | Route high-value cases to merchant ops |
| `record_outcome` | `payment_id, action, status` | Audit log ID & SHA-256 hash | Append tamper-resistant audit trail |

---

## 3. Merchant Policy Engine Rules

The Policy Engine (`backend/policies/policy_engine.py`) enforces hard business constraints that **deterministically override AI recommendations** if breached:

1. **Transaction Amount Cap**: Auto-recovery limited to $\le$ ₹10,000. Transactions above ₹10,000 are automatically escalated to human merchant ops review (`HUMAN_ESCALATION`).
2. **Maximum Retry Limit**: Payment retries limited to $< 2$ attempts to prevent card issuer fraud flagging and merchant ban.
3. **Minimum Success Probability**: Autonomous execution blocked if $P(\text{recovery\_success}) < 40\%$.
4. **Maximum Contact Attempts**: Customer communications capped at $\le 2$ reminders.
5. **Global Auto-Recovery Toggle**: Merchant can globally pause autonomous recovery.

---

## 4. Firebase Firestore Schema Design

### Collection: `payments`
- `payment_id` (string, PK)
- `customer_id` (string, FK)
- `amount_paisa` (integer)
- `failure_reason` (string: `bank_timeout`, `card_expired`, `insufficient_funds`, `card_declined`)
- `retry_count` (integer)
- `status` (string: `PENDING`, `EXECUTED`, `BLOCKED`, `HUMAN_ESCALATION`)

### Collection: `audit_logs`
- `id` (string, PK)
- `event_id` (string, Unique)
- `timestamp` (string ISO-8601)
- `entity_type` (string)
- `entity_id` (string)
- `actor` (string: `SYSTEM`, `AGENT`, `POLICY_ENGINE`, `WEBHOOK`)
- `action` (string)
- `details` (map)
- `hash` (string SHA-256 checksum)
