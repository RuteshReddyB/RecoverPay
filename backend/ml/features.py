import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List

FEATURE_CATEGORICAL_COLS = [
    "failure_reason",
    "payment_method",
    "recovery_action",
    "device_type",
    "subscription_status",
    "previous_payment_method"
]

FEATURE_NUMERIC_COLS = [
    "amount_paisa",
    "customer_age",
    "customer_lifetime_days",
    "customer_ltv_paisa",
    "previous_transactions",
    "previous_successes",
    "previous_failures",
    "historical_success_rate",
    "retry_count",
    "checkout_duration_sec",
    "amount_to_ltv_ratio",
    "failure_rate"
]

def extract_raw_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute derived domain ratios and feature columns from raw transaction data.
    """
    df = df.copy()
    
    # Derived domain feature calculations
    df["amount_to_ltv_ratio"] = df["amount_paisa"] / (df["customer_ltv_paisa"] + 10000)
    df["failure_rate"] = df["previous_failures"] / (df["previous_transactions"] + 1)
    
    return df

def prepare_feature_matrix(df: pd.DataFrame, is_training: bool = True, feature_columns: List[str] = None) -> Tuple[pd.DataFrame, List[str]]:
    """
    Convert pandas DataFrame into one-hot encoded feature matrix ready for ML models.
    """
    df_prepared = extract_raw_features(df)
    
    # One-hot encoding
    df_encoded = pd.get_dummies(df_prepared, columns=FEATURE_CATEGORICAL_COLS, drop_first=False)
    
    # Collect all numeric and dummy feature columns
    encoded_cols = [c for c in df_encoded.columns if c not in [
        "transaction_id", "customer_id", "timestamp", "failure_code",
        "checkout_started", "checkout_completed", "recovery_probability_true",
        "recovery_success", "amount_recovered_paisa"
    ]]
    
    if is_training:
        return df_encoded[encoded_cols], encoded_cols
    else:
        # Align prediction columns with trained model feature columns
        for col in feature_columns:
            if col not in df_encoded.columns:
                df_encoded[col] = 0
        return df_encoded[feature_columns], feature_columns
