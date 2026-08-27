# Implementation Plan - RevenueGuard AI (Razorpay AI Buildathon Track 03)

RevenueGuard AI is an autonomous revenue recovery agent designed to **Detect → Diagnose → Decide → Recover → Measure** payment failures and revenue at risk using Razorpay Test Mode APIs, machine learning, structured policy enforcement, and a business-focused dashboard.

---

## User Review Required

> [!IMPORTANT]
> **Key Architecture Decisions**:
> 1. **Framework & Tech Stack**:
>    - **Backend**: FastAPI (Python 3.10+) with SQLAlchemy (SQLite for zero-config local dev & instant setup, compatible with PostgreSQL).
>    - **Frontend**: Vite + React + TypeScript + Tailwind CSS + Lucide Icons + Recharts.
>    - **ML Framework**: Scikit-learn + XGBoost for tabular recovery probability prediction `P(success | customer, transaction, failure, action)`.
>    - **Agent Framework**: LLM tool calling (OpenAI/Gemini/Anthropic compatible) with a robust rule-based deterministic agent fallback to guarantee seamless operation out-of-the-box even without active API keys.
> 2. **Razorpay Integration**:
>    - Includes both live Razorpay Test Mode API integration (using `razorpay` Python SDK) and a sandbox fallback runner to execute payment links, retries, and webhooks in local environments seamlessly.
> 3. **Safety & Policy Engine**:
>    - Deterministic policy enforcement that overrides LLM outputs for amounts > ₹10,000, max retries >= 2, probability < 40%, or contact restrictions.

---

## Proposed Phases & Implementation Steps

### Phase 1: Directory Structure & Core Backend Foundation
- [ ] Initialize repository structure (`frontend/`, `backend/`, `data/`, `models/`, `docs/`).
- [ ] Set up Python environment dependencies (`requirements.txt`) including FastAPI, Uvicorn, Pydantic, SQLAlchemy, Scikit-learn, XGBoost, Razorpay SDK, Pandas, NumPy.
- [ ] Implement Database Schemas (`backend/models/db.py`):
  - `customers`: Customer history, LTV, success rates, preferred payment methods.
  - `payments`: Razorpay payment IDs, amounts, failure reasons, transaction state.
  - `recovery_attempts`: Action taken, predicted probability, expected recovery, policy result, outcome.
  - `audit_logs`: Chronological timeline events, decisions, policy checks, API results.
  - `merchant_policies`: Policy configuration settings.
- [ ] Implement initial DB initialization and seed utilities.

---

### Phase 2: Synthetic Data Generation & ML Pipeline
- [ ] **Data Generator (`data/synthetic_generator.py`)**:
  - Generate ~25,000 realistic transaction & failure records with domain-accurate correlations:
    - *Temporary Bank Timeout*: High retry success probability (~80-90%).
    - *Insufficient Balance*: Low immediate retry success (~10-20%), higher payment link / reminder success.
    - *Card Failure + Strong UPI History*: High payment link success via UPI.
    - *Repeated Failures*: Lower recovery probability overall.
  - Export to `data/raw/transactions.csv` and split into train/test sets.
- [ ] **ML Training Script (`backend/ml/train.py`)**:
  - Feature engineering: historical success rate, retry count, amount ratio, failure severity, payment method compatibility.
  - Train & compare Logistic Regression, Random Forest, and XGBoost models.
  - Compute performance metrics: Precision, Recall, F1-score, ROC-AUC, Calibration Curve, Expected Revenue Uplift.
  - Save winning model to `models/recovery_model.pkl`.
- [ ] **ML Inference Service (`backend/ml/predictor.py`)**:
  - Fast prediction API computing `P(recovery_success | customer, transaction, failure, action)`.

---

### Phase 3: Policy Engine, Decision Engine & Razorpay Integration
- [ ] **Policy Engine (`backend/policies/policy_engine.py`)**:
  - Strict rule checks:
    - `MAX_AUTO_RECOVERY_AMOUNT` = ₹10,000 (amounts above require human approval)
    - `MAX_RETRY_ATTEMPTS` = 2
    - `MIN_RECOVERY_PROBABILITY` = 40%
    - `MAX_CONTACT_ATTEMPTS` = 2
  - Evaluates action proposals and returns `APPROVED`, `BLOCKED`, or `HUMAN_ESCALATION`.
- [ ] **Decision Engine (`backend/services/decision_engine.py`)**:
  - Computes `Expected Recovery Value = Amount * P(recovery_success | action)`.
  - Ranks actions (`RETRY`, `PAYMENT_LINK`, `REMINDER`, `SCHEDULE_FOLLOWUP`, `HUMAN_ESCALATION`).
- [ ] **Razorpay Integration (`backend/services/razorpay_service.py`)**:
  - Payment link creation, payment retry initiation, test mode webhook processing.
  - Signature verification and idempotency check to prevent double recovery executions.

---

### Phase 4: Autonomous Recovery Agent & API Routes
- [ ] **Agent & Tools (`backend/agents/recovery_agent.py`)**:
  - Tool definitions: `get_payment_details`, `get_customer_history`, `predict_recovery_probability`, `calculate_expected_recovery`, `validate_policy`, `execute_razorpay_action`, `escalate_to_human`, `record_outcome`.
  - Autonomous loop: Detect → Diagnose → Predict → Select → Policy Validate → Execute → Record Audit.
- [ ] **FastAPI Endpoints (`backend/api/`)**:
  - `/api/payments`: Payment events, at-risk list, failure details.
  - `/api/recovery`: Queue, execute recovery action, bulk process.
  - `/api/analytics`: Overview metrics, revenue funnel, model comparison.
  - `/api/webhooks/razorpay`: Razorpay webhook ingestion with idempotency.
  - `/api/simulation`: Event simulation trigger for live demo testing.

---

### Phase 5: Baseline vs AI Benchmark Evaluation Suite
- [ ] **Batch Evaluator (`backend/evaluation/benchmark.py`)**:
  - Run 1,000+ synthetic payment failure events through:
    1. **Baseline Strategy**: Fixed interval retry for all failed payments.
    2. **RevenueGuard AI Strategy**: Autonomous diagnosis, probability prediction, policy validation, optimal intervention selection.
  - Output comparative report: Revenue at risk, Revenue recovered, Recovery rate %, Recovery uplift (₹ and %), False intervention cost, Escalations, Stopped cases.

---

### Phase 6: Modern React Dashboard (Frontend)
- [ ] Initialize React + TypeScript + Vite project in `frontend/` with Tailwind CSS & Lucide icons.
- [ ] Build Dashboard Views:
  1. **Overview Dashboard**: Top KPI cards (Revenue at Risk, Recovered, Recovery Rate %, AI Uplift %), Revenue Funnel, Recent Activity.
  2. **Recovery Queue**: Filterable list of payment failure cases with risk priority badges, recovery probability %, and quick action triggers.
  3. **AI Decision Panel (Modal/Drawer)**: Deep dive into selected payment — failure root cause, customer history summary, option matrix (Retry vs Payment Link vs Reminder probabilities & expected recovery), policy safety check results, and single-click execution.
  4. **Human Escalation Queue**: Cases flagged for manual merchant review (high value, max retries reached, policy violations).
  5. **Audit Trail**: Real-time step-by-step execution log of all recovery decisions.
  6. **Benchmark & Evaluation View**: Comparative visual charts (Recharts) comparing Baseline vs RevenueGuard AI metrics.
  7. **Live Event Simulator**: UI tool to inject mock payment events (e.g. Bank Timeout, Insufficient Funds, High Value, Duplicate Webhook) to test system live during demo.

---

### Phase 7: Docker, Documentation & Verification
- [ ] `docker-compose.yml` for unified running of backend and frontend.
- [ ] Detailed `README.md`, `docs/architecture.md`, `docs/api.md`, `docs/evaluation.md`.
- [ ] Verification tests for failure cases: API timeout, duplicate webhooks, policy violations, max retry limits.

---

## Verification Plan

### Automated Verification
- Run synthetic data generation and verify dataset output size and features (`python data/synthetic_generator.py`).
- Run ML training script and verify model metrics output (`python backend/ml/train.py`).
- Run pytest suite covering:
  - Policy Engine rules (`test_policy_engine.py`)
  - Webhook signature validation & idempotency (`test_webhooks.py`)
  - Decision engine expected value ranking (`test_decision_engine.py`)
- Run batch evaluation script (`python backend/evaluation/benchmark.py`).

### Manual & UI Verification
- Start backend (`uvicorn backend.main:app`) and frontend (`npm run dev`).
- Trigger test simulated failure events from the UI Simulator.
- Verify live UI updates: KPI cards, Recovery Queue status changes, Audit Log appending step-by-step entries, and Razorpay test API executions.
