import os
import pandas as pd
from data.synthetic_generator import generate_synthetic_dataset

def test_generate_synthetic_dataset(tmp_path):
    test_csv = tmp_path / "test_transactions.csv"
    df = generate_synthetic_dataset(num_records=100, output_path=str(test_csv))
    
    assert len(df) == 100
    assert os.path.exists(test_csv)
    
    required_cols = [
        "transaction_id", "customer_id", "timestamp", "amount_paisa",
        "payment_method", "device_type", "failure_reason", "failure_code",
        "customer_age", "customer_lifetime_days", "customer_ltv_paisa",
        "previous_transactions", "previous_successes", "previous_failures",
        "historical_success_rate", "retry_count", "subscription_status",
        "checkout_duration_sec", "recovery_action", "recovery_probability_true",
        "recovery_success", "amount_recovered_paisa"
    ]
    for col in required_cols:
        assert col in df.columns
        
    assert df["recovery_success"].isin([0, 1]).all()
    assert (df["recovery_probability_true"] >= 0.0).all() and (df["recovery_probability_true"] <= 1.0).all()
