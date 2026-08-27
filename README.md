# RecoverPay AI — Autonomous Payment Recovery Engine

> **Razorpay AI Buildathon Submission — Track 03: Agentic AI for Payment Recovery**
>
> RecoverPay AI is an enterprise-grade autonomous payment recovery agent designed to intelligently diagnose transaction failure root causes, predict intervention success probabilities, validate actions against strict merchant safety policies, and execute optimal recovery workflows via Razorpay Test APIs.

---

## 🌟 Executive Highlights

- **+253.35% Financial Revenue Recovery Uplift**: Empirically verified across 1,000 payment failure events (Recovered **₹97.09 Lakhs** vs. **₹27.47 Lakhs** baseline).
- **8 Structured Agent Tools**: Operates strictly within type-safe boundaries (`get_payment_details`, `get_customer_history`, `predict_recovery_probability`, `calculate_expected_recovery`, `validate_policy`, `execute_razorpay_action`, `escalate_to_human`, `record_outcome`).
- **Deterministic Policy Engine**: Hard business safety boundaries (Max Auto Recovery Amount $\le$ ₹10,000, Max Retries $<$ 2, Min Probability $\ge$ 40%) that deterministically override AI recommendations when breached.
- **Transparent 7-Step Reasoning Trace**: Every decision logs a complete tool invocation timeline for audit transparency.
- **Dual-Runner Agent Architecture**: Supports LLM tool calling (OpenAI / Gemini compatible) AND includes a zero-config deterministic fallback runner so the app runs **100% locally out-of-the-box**.
- **Modern Fintech Control Center**: React + TypeScript + Tailwind CSS dashboard featuring **Soft Light Grey theme default**, Sun/Moon dark mode toggle, AI Decision Drawer, Security Audit Trail, and a **Live Payment Event Simulator**.

---

## 🏗️ System Architecture Overview

```text
Payment Failure Webhook / API Event
                ↓
    Razorpay Webhook Receiver
   (HMAC SHA256 & Idempotency Filter)
                ↓
   Autonomous AI Recovery Agent
                │
   ┌────────────┴──────────────────────────┐
   │ Structured Tool Execution Cycle       │
   │ 1. get_payment_details()              │
   │ 2. get_customer_history()             │
   │ 3. predict_recovery_probability() (XGBoost)
   │ 4. calculate_expected_recovery()      │
   │ 5. validate_policy() (Policy Engine)  │
   │ 6. execute_razorpay_action() / Escalate
   │ 7. record_outcome() (SHA-256 Audit Log)
   └────────────┬──────────────────────────┘
                ↓
Razorpay Sandbox Intervention (Payment Link / Instant Retry / SMS Reminder)
                ↓
    Firebase Firestore Database (Append-Only Audit Trail)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ (for frontend)
- Docker & Docker Compose (Optional for containerized run)

### Option A: Local Development Setup

1. **Clone Repository & Setup Environment**:
   ```bash
   git clone https://github.com/RuteshReddyB/RecoverPay.git
   cd RecoverPay
   ```

2. **Install & Launch Backend API**:
   ```bash
   pip install -r requirements.txt
   python -m uvicorn backend.main:app --reload --port 8000
   ```
   *Backend interactive Swagger docs will be live at `http://127.0.0.1:8000/docs`.*

3. **Install & Launch Frontend Dashboard**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Frontend Control Center will be live at `http://localhost:5173`.*

---

### Option B: One-Command Docker Deployment

Launch backend (`:8000`) and frontend (`:5173`) using Docker Compose:

```bash
docker compose up --build
```

---

## 📊 Verified 1,000-Event Benchmark Performance

We ran a batch evaluation across **1,000 payment failure events** comparing standard fixed retries (Baseline) vs. RecoverPay AI:

| Metric | Baseline Strategy | RecoverPay AI | Uplift Impact |
| :--- | :--- | :--- | :--- |
| **Total Revenue at Risk** | ₹1.31 Crore | ₹1.31 Crore | Baseline Risk Pool |
| **Total Revenue Recovered** | **₹27.47 Lakhs** | **₹97.09 Lakhs** | **+₹69.61 Lakhs** |
| **Recovery Rate %** | **20.93%** | **73.96%** | **+53.03% Absolute Gain** |
| **Additional Recovery Uplift %** | Ref Baseline | **+253.35%** | **+253.35% Revenue Uplift** |
| **Avoided Doomed Retries** | 0 (All retried) | **285 prevented** | **Prevented card issuer bans** |
| **Human Escalations Triggered** | 0 (Manual) | **276 reviewed** | **Strict ₹10k safety cap** |

---

## 🧪 Automated Verification & Testing

Run all 38 automated backend unit and integration tests:

```bash
python -m pytest tests/
```

Run frontend build verification:

```bash
cd frontend
npm run build
```

---

## 📁 Repository Directory Structure

```text
RecoverPay/
├── backend/
│   ├── agents/          # Autonomous Agent Engine (recovery_agent.py)
│   ├── api/             # FastAPI REST Routers (prediction, recovery, webhooks, agent, analytics)
│   ├── db/              # Firebase Firestore SDK & Mock Runner (firebase.py)
│   ├── evaluation/      # 1,000-Event Batch Evaluator (benchmark.py)
│   ├── ml/              # Trained XGBoost ML Model & Predictor (predictor.py)
│   ├── policies/        # Deterministic Policy Engine (policy_engine.py)
│   ├── schemas/         # Pydantic Data Models (customer, payment, recovery, policy, audit)
│   ├── services/        # Business Logic Repositories & Razorpay SDK Client
│   └── tools/           # 8 Typed Agent Tool Definitions (recovery_tools.py)
├── data/                # 75,000 Synthetic Dataset & Generator
├── docs/                # Architecture, API & Evaluation Specs
├── frontend/            # React + TypeScript + Vite + Tailwind Control Center
├── models/              # Saved XGBoost Model & Benchmark Report
├── tests/               # 38 Automated Pytest Unit & Integration Tests
├── Dockerfile.backend   # Backend Container Config
├── Dockerfile.frontend  # Frontend Nginx Container Config
└── docker-compose.yml   # Multi-Container Compose Config
```

---

## 🔐 Security & Compliance

- **PII Masking**: Customer emails (`j***n@example.com`) and phone numbers (`+91******3210`) are redacted before logging or displaying.
- **Integer Paisa Math**: All monetary calculations use Integer Paisa (`₹4,999.00` = `499900 paisa`) ensuring **0% floating-point math error**.
- **Cryptographic Audit Trail**: Every decision generates an immutable audit log entry with SHA-256 event checksums.
- **HMAC Signature Check**: Webhook receiver verifies Razorpay HMAC SHA256 signatures in constant-time with duplicate `event_id` idempotency rejection.

---

## 🏆 Razorpay Buildathon Submission Summary

- **Track**: Track 03 — Agentic AI for Payment Recovery
- **Repository**: [GitHub - RuteshReddyB/RecoverPay](https://github.com/RuteshReddyB/RecoverPay)
- **Primary Innovation**: Autonomous 8-Tool Agent + XGBoost Expected Value Optimization + Deterministic Policy Safety Boundaries + 7-Step Reasoning Trace Transparency.