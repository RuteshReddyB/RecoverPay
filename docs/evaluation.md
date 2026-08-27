# Benchmark Evaluation Methodology & Empirical Results — RecoverPay AI

## 1. Evaluation Methodology

To evaluate RecoverPay AI under real-world domain conditions, we constructed a 1,000-event batch evaluation harness (`backend/evaluation/benchmark.py`) comparing two strategies head-to-head across the exact same set of payment failure events:

1. **Baseline Strategy (Fixed Immediate Retry)**:
   - Simulates standard merchant retry logic. Every failed payment triggers an immediate retry, regardless of failure reason or customer history.
   - For doomed failures (e.g. `card_expired`, `card_declined`), retries fail 95% of the time and risk issuer fraud flags.

2. **RecoverPay AI Strategy**:
   - Analyzes failure cause and customer profile.
   - Predicts $P(\text{recovery\_success} \mid \text{action})$ across candidate interventions (`RETRY`, `PAYMENT_LINK`, `REMINDER`, `SCHEDULE_FOLLOWUP`, `HUMAN_ESCALATION`).
   - Ranks interventions by Expected Value ($\text{Amount} \times P(\text{success})$).
   - Enforces Policy Engine safety rules (caps auto-recovery at ₹10k, caps retries at 2, blocks $P < 40\%$).

---

## 2. Empirical 1,000-Event Benchmark Results

```text
Batch Size: 1,000 Payment Failures
Total Revenue at Risk: ₹13,127,159.21 (₹1.31 Crore)
```

### Financial Metric Breakdown

| Metric | Baseline Strategy | RecoverPay AI | Impact / Delta |
| :--- | :--- | :--- | :--- |
| **Total Revenue Recovered** | ₹27,47,772.03 | **₹97,09,178.72** | **+₹69.61 Lakhs** |
| **Recovery Rate %** | 20.93% | **73.96%** | **+53.03% Absolute Gain** |
| **Additional Recovery Uplift %** | Ref Baseline | **+253.35%** | **+253.35% Revenue Uplift** |
| **Avg Recovery / Event** | ₹2,747.77 | **₹9,709.18** | **+3.53x Value per Event** |

---

## 3. Operational Safety & Efficiency Metrics

- **Autonomous Interventions Executed**: 724 optimal actions dispatched without human intervention.
- **Human Escalations Triggered**: 276 high-value transactions (> ₹10,000 threshold) routed to merchant ops review.
- **Avoided Doomed Retries**: **285 doomed retries prevented** on expired or declined cards by switching to Payment Link SMS instead of retrying the card.

---

## 4. Machine Learning Model Performance

- **Evaluated Models**: Logistic Regression, Random Forest, XGBoost Classifier.
- **Winning Model**: **XGBoost Classifier**
- **Test Set Size**: 15,000 holdout records
- **ROC-AUC Score**: **0.7653**
- **F1-Score**: **0.6659**
- **Inference Speed**: **0.000013 seconds per prediction** (vectorized NumPy execution)
