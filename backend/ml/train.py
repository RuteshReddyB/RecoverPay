import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    XGBClassifier = None
    HAS_XGBOOST = False
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
)
from backend.ml.features import prepare_feature_matrix
from data.synthetic_generator import generate_synthetic_dataset

DATA_PATH = "data/raw/transactions.csv"
MODEL_DIR = "models"

def evaluate_business_revenue(test_df: pd.DataFrame, trained_model, feature_cols: list) -> dict:
    """
    Calculate real business financial impact comparing:
    1. Baseline strategy (Fixed immediate RETRY for all payment failures)
    2. RevenueGuard AI strategy (Model selects best action with highest expected recovery)
    """
    test_df = test_df.copy()
    
    # Calculate Total Revenue At Risk in Test Set
    total_risk_paisa = int(test_df["amount_paisa"].sum())
    
    # 1. Baseline: Immediate Retry for all
    # Find outcome when action was RETRY
    retry_subset = test_df[test_df["recovery_action"] == "RETRY"]
    baseline_recovery_rate = retry_subset["recovery_success"].mean() if len(retry_subset) > 0 else 0.35
    baseline_recovered_paisa = int(total_risk_paisa * baseline_recovery_rate)
    
    # 2. RevenueGuard AI Model Strategy
    # For each transaction in test set, predict probabilities for all candidate actions and select best action
    actions = ["RETRY", "PAYMENT_LINK", "REMINDER", "SCHEDULE_FOLLOWUP", "HUMAN_ESCALATION"]
    
    # Vectorized evaluation: construct feature matrices for each candidate action
    action_exp_values = []
    
    for act in actions:
        test_act_df = test_df.copy()
        test_act_df["recovery_action"] = act
        X_act, _ = prepare_feature_matrix(test_act_df, is_training=False, feature_columns=feature_cols)
        act_probs = trained_model.predict_proba(X_act)[:, 1]
        exp_vals = test_df["amount_paisa"].values * act_probs
        action_exp_values.append(exp_vals)
        
    # Matrix of shape (5, N_test)
    exp_matrix = np.array(action_exp_values)
    best_action_indices = np.argmax(exp_matrix, axis=0)
    best_actions = [actions[idx] for idx in best_action_indices]
    
    # Calculate simulated recovery
    actual_actions = test_df["recovery_action"].values
    actual_recovered = test_df["amount_recovered_paisa"].values
    amounts = test_df["amount_paisa"].values
    true_probs = test_df.get("recovery_probability_true", pd.Series(0.5, index=test_df.index)).values
    
    ai_recovered_paisa = 0
    for i in range(len(test_df)):
        b_act = best_actions[i]
        if b_act == actual_actions[i]:
            ai_recovered_paisa += actual_recovered[i]
        else:
            rec = amounts[i] if np.random.random() < true_probs[i] else 0
            ai_recovered_paisa += rec

    uplift_paisa = ai_recovered_paisa - baseline_recovered_paisa
    uplift_percent = round((uplift_paisa / max(1, baseline_recovered_paisa)) * 100, 2)
    
    return {
        "total_revenue_at_risk_paisa": int(total_risk_paisa),
        "total_revenue_at_risk_rupees": float(round(total_risk_paisa / 100, 2)),
        "baseline_recovered_paisa": int(baseline_recovered_paisa),
        "baseline_recovered_rupees": float(round(baseline_recovered_paisa / 100, 2)),
        "baseline_recovery_rate_pct": float(round(baseline_recovery_rate * 100, 2)),
        "ai_recovered_paisa": int(ai_recovered_paisa),
        "ai_recovered_rupees": float(round(ai_recovered_paisa / 100, 2)),
        "ai_recovery_rate_pct": float(round((ai_recovered_paisa / max(1, total_risk_paisa)) * 100, 2)),
        "additional_revenue_recovered_rupees": float(round(uplift_paisa / 100, 2)),
        "revenue_uplift_pct": float(uplift_percent)
    }

def train_and_evaluate():
    if not os.path.exists(DATA_PATH):
        df = generate_synthetic_dataset(75000, DATA_PATH)
    else:
        df = pd.read_csv(DATA_PATH)

    print(f"Loaded dataset: {len(df)} records.")
    
    # Prepare Features and Target
    X, feature_cols = prepare_feature_matrix(df, is_training=True)
    y = df["recovery_success"]

    # Train / Test Split
    X_train, X_test, y_train, y_test, df_train, df_test = train_test_split(
        X, y, df, test_size=0.20, random_state=42, stratify=y
    )

    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    }
    if HAS_XGBOOST:
        models["XGBoost"] = XGBClassifier(n_estimators=150, max_depth=6, learning_rate=0.08, random_state=42, eval_metric="logloss", n_jobs=-1)

    best_model_name = None
    best_roc_auc = -1.0
    best_model_obj = None
    model_results = {}

    print("\n--- Training and Evaluating ML Models ---")
    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba)
        cm = confusion_matrix(y_test, y_pred).tolist()

        print(f"[{name}] Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")
        
        model_results[name] = {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(auc), 4),
            "confusion_matrix": cm
        }

        if auc > best_roc_auc:
            best_roc_auc = auc
            best_model_name = name
            best_model_obj = model

    print(f"\n[WINNER] Winning Model: {best_model_name} (ROC-AUC: {best_roc_auc:.4f})")

    # Financial Business Impact Evaluation for Winning Model
    print("\nRunning Financial Business Impact Benchmark on Test Set (15,000 transactions)...")
    business_metrics = evaluate_business_revenue(df_test, best_model_obj, feature_cols)
    print(f"Revenue at Risk: Rs. {business_metrics['total_revenue_at_risk_rupees']:,.2f}")
    print(f"Baseline Recovery: Rs. {business_metrics['baseline_recovered_rupees']:,.2f} ({business_metrics['baseline_recovery_rate_pct']}%)")
    print(f"RevenueGuard Recovery: Rs. {business_metrics['ai_recovered_rupees']:,.2f} ({business_metrics['ai_recovery_rate_pct']}%)")
    print(f"Additional Recovered: +Rs. {business_metrics['additional_revenue_recovered_rupees']:,.2f} (Uplift: +{business_metrics['revenue_uplift_pct']}%)")

    # Save Model Artifacts
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump({
        "model": best_model_obj,
        "feature_columns": feature_cols,
        "model_name": best_model_name
    }, os.path.join(MODEL_DIR, "recovery_model.pkl"))

    metrics_payload = {
        "winning_model": best_model_name,
        "model_evaluations": model_results,
        "business_metrics": business_metrics,
        "feature_columns": feature_cols
    }
    with open(os.path.join(MODEL_DIR, "model_metrics.json"), "w") as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"\nSaved model to {MODEL_DIR}/recovery_model.pkl and metrics to {MODEL_DIR}/model_metrics.json")
    return metrics_payload

if __name__ == "__main__":
    train_and_evaluate()
