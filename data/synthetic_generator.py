import os
import random
import uuid
import datetime
import pandas as pd
import numpy as np

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

FAILURE_REASONS = [
    "bank_timeout",
    "insufficient_funds",
    "card_declined",
    "card_expired",
    "checkout_abandoned",
    "user_cancelled",
    "authentication_failed"
]

FAILURE_CODES = {
    "bank_timeout": "GATEWAY_ERROR",
    "insufficient_funds": "BAD_REQUEST_ERROR",
    "card_declined": "CARD_DECLINED",
    "card_expired": "EXPIRED_CARD",
    "checkout_abandoned": "CUSTOMER_ABANDONED",
    "user_cancelled": "USER_CANCELLED",
    "authentication_failed": "AUTHENTICATION_FAILED"
}

PAYMENT_METHODS = ["upi", "card", "netbanking", "wallet"]
DEVICE_TYPES = ["mobile_android", "mobile_ios", "desktop_web"]
RECOVERY_ACTIONS = ["RETRY", "PAYMENT_LINK", "REMINDER", "SCHEDULE_FOLLOWUP", "HUMAN_ESCALATION"]
SUBSCRIPTION_STATUSES = ["active", "cancelled", "none"]

def calculate_recovery_probability(
    failure_reason: str,
    action: str,
    historical_success_rate: float,
    retry_count: int,
    amount_paisa: int,
    customer_ltv_paisa: int,
    payment_method: str
) -> float:
    """
    Calculate realistic domain-correlated recovery probability for a given context + action.
    """
    # Base probabilities depending on Failure Reason + Recovery Action combination
    base_probs = {
        "bank_timeout": {
            "RETRY": 0.85,
            "PAYMENT_LINK": 0.65,
            "REMINDER": 0.35,
            "SCHEDULE_FOLLOWUP": 0.50,
            "HUMAN_ESCALATION": 0.40
        },
        "insufficient_funds": {
            "RETRY": 0.15,
            "PAYMENT_LINK": 0.72,
            "REMINDER": 0.55,
            "SCHEDULE_FOLLOWUP": 0.68,
            "HUMAN_ESCALATION": 0.45
        },
        "card_declined": {
            "RETRY": 0.08,
            "PAYMENT_LINK": 0.78,
            "REMINDER": 0.40,
            "SCHEDULE_FOLLOWUP": 0.60,
            "HUMAN_ESCALATION": 0.50
        },
        "card_expired": {
            "RETRY": 0.05,
            "PAYMENT_LINK": 0.82,
            "REMINDER": 0.45,
            "SCHEDULE_FOLLOWUP": 0.65,
            "HUMAN_ESCALATION": 0.50
        },
        "checkout_abandoned": {
            "RETRY": 0.15,
            "PAYMENT_LINK": 0.65,
            "REMINDER": 0.60,
            "SCHEDULE_FOLLOWUP": 0.55,
            "HUMAN_ESCALATION": 0.35
        },
        "user_cancelled": {
            "RETRY": 0.10,
            "PAYMENT_LINK": 0.50,
            "REMINDER": 0.40,
            "SCHEDULE_FOLLOWUP": 0.45,
            "HUMAN_ESCALATION": 0.30
        },
        "authentication_failed": {
            "RETRY": 0.78,
            "PAYMENT_LINK": 0.65,
            "REMINDER": 0.35,
            "SCHEDULE_FOLLOWUP": 0.50,
            "HUMAN_ESCALATION": 0.40
        }
    }

    prob = base_probs.get(failure_reason, {}).get(action, 0.40)

    # Modifiers:
    # 1. Historical success rate boost/penalty
    if historical_success_rate > 0.85:
        prob += 0.12
    elif historical_success_rate < 0.50:
        prob -= 0.15

    # 2. Retry count penalty (if retried multiple times, success rate drops)
    if retry_count >= 2:
        if action == "RETRY":
            prob -= 0.35
        else:
            prob -= 0.15
    elif retry_count == 1:
        if action == "RETRY":
            prob -= 0.15

    # 3. High LTV customer boost (more responsive to payment links & reminders)
    if customer_ltv_paisa > 5000000: # > ₹50,000
        if action in ["PAYMENT_LINK", "REMINDER"]:
            prob += 0.10

    # 4. Payment method affinity (card failure + UPI history -> Payment Link works well)
    if payment_method == "card" and action == "PAYMENT_LINK":
        prob += 0.08

    # 5. Very high amount penalty (> ₹20,000)
    if amount_paisa > 2000000:
        prob -= 0.10

    # Clip to valid probability bounds [0.03, 0.96]
    return float(np.clip(prob, 0.03, 0.96))

def generate_synthetic_dataset(num_records: int = 75000, output_path: str = "data/raw/transactions.csv") -> pd.DataFrame:
    print(f"Generating {num_records} synthetic transaction failure and recovery records...")
    
    # Generate 15,000 distinct customer profiles
    num_customers = num_records // 5
    customer_ids = [f"c_{uuid.uuid4().hex[:8]}" for _ in range(num_customers)]
    customer_profiles = {}
    
    for cid in customer_ids:
        prev_txns = random.randint(1, 40)
        succ_rate = float(np.clip(np.random.beta(5, 1.5), 0.2, 0.98))
        prev_succ = int(round(prev_txns * succ_rate))
        prev_fail = prev_txns - prev_succ
        ltv_paisa = prev_succ * random.randint(50000, 800000) # ₹500 - ₹8000 avg per txn
        
        customer_profiles[cid] = {
            "customer_age": random.randint(18, 65),
            "customer_lifetime_days": random.randint(10, 1000),
            "customer_ltv_paisa": ltv_paisa,
            "previous_transactions": prev_txns,
            "previous_successes": prev_succ,
            "previous_failures": prev_fail,
            "historical_success_rate": round(succ_rate, 4),
            "previous_payment_method": random.choice(PAYMENT_METHODS)
        }
        
    records = []
    start_date = datetime.datetime.now() - datetime.timedelta(days=180)
    
    for i in range(num_records):
        cid = random.choice(customer_ids)
        c_prof = customer_profiles[cid]
        
        amount_paisa = random.choice([
            random.randint(19900, 99900),     # ₹199 - ₹999
            random.randint(149900, 499900),   # ₹1499 - ₹4999
            random.randint(799900, 1499900),  # ₹7999 - ₹14999
            random.randint(1999900, 4999900)  # ₹19999 - ₹49999
        ])
        
        payment_method = c_prof["previous_payment_method"] if random.random() < 0.7 else random.choice(PAYMENT_METHODS)
        device_type = random.choice(DEVICE_TYPES)
        failure_reason = random.choice(FAILURE_REASONS)
        failure_code = FAILURE_CODES[failure_reason]
        retry_count = random.choice([0, 0, 0, 1, 1, 2, 3])
        subscription_status = random.choice(SUBSCRIPTION_STATUSES)
        
        checkout_started = 1
        checkout_completed = 0 if failure_reason == "checkout_abandoned" else 1
        checkout_duration_sec = random.randint(10, 180) if checkout_completed else random.randint(2, 45)
        
        # Pick recovery action (simulate historic interventions taken by merchant)
        action = random.choice(RECOVERY_ACTIONS)
        
        prob_success = calculate_recovery_probability(
            failure_reason=failure_reason,
            action=action,
            historical_success_rate=c_prof["historical_success_rate"],
            retry_count=retry_count,
            amount_paisa=amount_paisa,
            customer_ltv_paisa=c_prof["customer_ltv_paisa"],
            payment_method=payment_method
        )
        
        # Sample recovery outcome based on calculated probability
        recovery_success = 1 if random.random() < prob_success else 0
        amount_recovered_paisa = amount_paisa if recovery_success else 0
        
        timestamp = start_date + datetime.timedelta(minutes=random.randint(0, 259200))
        
        record = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:10]}",
            "customer_id": cid,
            "timestamp": timestamp.isoformat(),
            "amount_paisa": amount_paisa,
            "payment_method": payment_method,
            "device_type": device_type,
            "failure_reason": failure_reason,
            "failure_code": failure_code,
            "customer_age": c_prof["customer_age"],
            "customer_lifetime_days": c_prof["customer_lifetime_days"],
            "customer_ltv_paisa": c_prof["customer_ltv_paisa"],
            "previous_transactions": c_prof["previous_transactions"],
            "previous_successes": c_prof["previous_successes"],
            "previous_failures": c_prof["previous_failures"],
            "historical_success_rate": c_prof["historical_success_rate"],
            "previous_payment_method": c_prof["previous_payment_method"],
            "retry_count": retry_count,
            "subscription_status": subscription_status,
            "checkout_started": checkout_started,
            "checkout_completed": checkout_completed,
            "checkout_duration_sec": checkout_duration_sec,
            "recovery_action": action,
            "recovery_probability_true": round(prob_success, 4),
            "recovery_success": recovery_success,
            "amount_recovered_paisa": amount_recovered_paisa
        }
        records.append(record)
        
    df = pd.DataFrame(records)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Successfully saved synthetic dataset ({len(df)} records) to {output_path}")
    return df

if __name__ == "__main__":
    generate_synthetic_dataset(75000)
