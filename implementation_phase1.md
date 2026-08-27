# Phase 1 Implementation Plan - Firebase & FastAPI Core Backend Foundation

## Objective
Establish a production-grade backend foundation for **RevenueGuard AI** using **Firebase Firestore** as the primary database store. This phase guarantees **0% financial calculation errors**, **0 data leaks/PII exposure**, **Firebase atomic transaction safety**, and real-time collection updates for the merchant dashboard.

---

## Architectural Advantages of Firebase Firestore

1. **Native Real-Time Synchronization**:
   - Firestore real-time listeners (`onSnapshot` / snapshot streams) allow the React frontend dashboard to react live as webhooks arrive and recovery actions complete, without manual HTTP polling.

2. **Server-Side Firebase Admin SDK (Python)**:
   - FastAPI backend uses `firebase-admin` Python SDK for privileged server-side access.
   - Atomic Firestore Transactions (`db.transaction()`) ensure ACID guarantees across `payments`, `recovery_attempts`, and `audit_logs`.

3. **Financial Integrity (0% Math Error Guarantee)**:
   - All monetary fields stored in Firestore documents as **Integer Paisa** (`amount_paisa: 499900` for ₹4,999.00) to eliminate floating-point representation errors.

4. **Zero Data Leak & Security Standards**:
   - PII fields (`email`, `phone`) masked in API loggers and public endpoint responses.
   - Audit logs stored as append-only Firestore documents in `audit_logs` collection with SHA-256 event checksums.
   - Firebase Admin credentials loaded securely via environment variables (`FIREBASE_CREDENTIALS_JSON` / `.env`).

---

## Firestore Collection Structure

```text
collections/
├── customers/              (Doc ID: customer_id)
│   ├── name: string
│   ├── email: string (masked in public responses)
│   ├── phone: string (masked in public responses)
│   ├── lifetime_value_paisa: int
│   ├── total_transactions: int
│   ├── successful_transactions: int
│   ├── failed_transactions: int
│   ├── preferred_payment_method: string
│   └── risk_score: float
│
├── payments/               (Doc ID: payment_id / rzp_payment_id)
│   ├── razorpay_payment_id: string
│   ├── razorpay_order_id: string
│   ├── customer_id: string
│   ├── amount_paisa: int
│   ├── status: string ('created', 'captured', 'failed', 'refunded')
│   ├── payment_method: string
│   ├── failure_reason: string
│   ├── failure_code: string
│   └── created_at: timestamp
│
├── recovery_attempts/      (Doc ID: attempt_id)
│   ├── payment_id: string
│   ├── customer_id: string
│   ├── action: string ('RETRY', 'PAYMENT_LINK', 'REMINDER', 'SCHEDULE_FOLLOWUP', 'HUMAN_ESCALATION')
│   ├── predicted_probability: float
│   ├── expected_recovery_paisa: int
│   ├── policy_status: string ('APPROVED', 'BLOCKED', 'HUMAN_ESCALATION')
│   ├── policy_reason: string
│   ├── execution_status: string ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED')
│   ├── amount_recovered_paisa: int
│   ├── razorpay_action_reference_id: string
│   └── executed_at: timestamp
│
├── audit_logs/             (Doc ID: log_id - Append-Only)
│   ├── event_id: string (UUID)
│   ├── entity_type: string
│   ├── entity_id: string
│   ├── actor: string ('SYSTEM', 'AGENT', 'POLICY_ENGINE', 'MERCHANT', 'WEBHOOK')
│   ├── action: string
│   ├── details_json: string
│   ├── hash: string (SHA-256)
│   └── timestamp: timestamp
│
└── merchant_policies/      (Doc ID: default_policy)
    ├── max_auto_recovery_amount_paisa: int (1000000 = ₹10,000)
    ├── max_retry_attempts: int (2)
    ├── min_recovery_probability: float (0.40)
    ├── max_contact_attempts: int (2)
    └── auto_recovery_enabled: bool (True)
```

---

## User Review Required

> [!IMPORTANT]
> **Firebase Setup & Mock/Emulator Mode**:
> 1. **Firebase Admin SDK Setup**: The backend will initialize `firebase-admin`. If no live Firebase service account key file is provided, the backend will automatically fallback to an in-memory/mock Firebase client with full Firestore collection interfaces, ensuring 100% immediate out-of-the-box local execution for testing and demo!
> 2. **Firestore Indexes**: Indexes defined for quick querying on `payments.customer_id`, `payments.status`, and `recovery_attempts.execution_status`.

---

## Proposed Phase 1 Implementation Steps

### 1. Directory & Environment Setup
Create project files and set up Python dependencies:
- `backend/config.py`: Pydantic settings with `FIREBASE_PROJECT_ID`, `FIREBASE_CREDENTIALS_JSON`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
- `backend/db/firebase.py`: Initializes `firebase-admin` app and provides thread-safe Firestore client wrapper with automatic Mock/Fallback runner when credentials are missing.

### 2. Financial & Security Utilities (`backend/utils/`)
- **`money.py`**: Rounding-safe Integer Paisa <-> Rupee conversions and expected recovery calculation.
- **`security.py`**: PII email & phone masking, Razorpay HMAC SHA256 webhook validator using `hmac.compare_digest`.
- **`logger.py`**: Structured logger with auto-redaction of PII and secrets.

### 3. Pydantic Document Schemas (`backend/schemas/`)
- Define validation models for `Customer`, `Payment`, `RecoveryAttempt`, `AuditLog`, `MerchantPolicy` with custom serializers for PII masking.

### 4. Firestore Repository Services (`backend/services/db_service.py`)
- Implement typed document repository handlers with Firestore transaction support:
  - `CustomerRepository`: get, create, update metrics.
  - `PaymentRepository`: get_at_risk_payments, record_payment_event, update_status.
  - `RecoveryAttemptRepository`: record_attempt, update_outcome.
  - `AuditLogRepository`: append_audit_log (append-only enforced).
  - `PolicyRepository`: get_policy, update_policy.

### 5. FastAPI Application & Health Check (`backend/main.py`)
- FastAPI app instance with CORS middleware.
- `/api/health` checking Firebase Firestore connectivity status, mock mode indicator, and policy configuration summary.

### 6. Automated Unit & Integration Tests (`tests/`)
- `tests/test_money_utils.py`: Validate Integer Paisa precision and expected value calculations.
- `tests/test_security.py`: Validate PII masking and HMAC signature verification.
- `tests/test_firebase_db.py`: Validate CRUD, transaction safety, and PII masking across Firestore repositories.

---

## Verification Plan

### Automated Tests
- Run `pytest tests/` in virtual environment to verify 100% test pass rate for financial math, PII redaction, and Firestore repository operations.

### Manual Verification
- Launch backend with `uvicorn backend.main:app --reload`.
- Query `http://127.0.0.1:8000/api/health` to confirm Firebase Firestore readiness and policy configuration.
