import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from backend.ml.features import prepare_feature_matrix
from backend.utils.money import calculate_expected_recovery_paisa, paisa_to_rupees
from backend.utils.logger import logger

MODEL_PATH = "models/recovery_model.pkl"
CANDIDATE_ACTIONS = ["RETRY", "PAYMENT_LINK", "REMINDER", "SCHEDULE_FOLLOWUP", "HUMAN_ESCALATION"]

class RecoveryPredictor:
    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self.feature_cols = None
        self.model_name = None
        self.load_model()

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.model = data["model"]
                self.feature_cols = data["feature_columns"]
                self.model_name = data.get("model_name", "XGBoost")
                logger.info(f"Successfully loaded trained ML model ({self.model_name}) from {self.model_path}")
            except Exception as e:
                logger.warning(f"Error loading model from {self.model_path}: {e}. Using rule-based fallback predictor.")
                self.model = None
        else:
            logger.info(f"Model file {self.model_path} not found. Running with rule-based probability predictor.")
            self.model = None

    def _rule_based_fallback_probability(self, failure_reason: str, action: str, retry_count: int, historical_success_rate: float) -> float:
        """
        Rule-based probability fallback when model file is not present.
        """
        base = {
            "bank_timeout": {"RETRY": 0.85, "PAYMENT_LINK": 0.65, "REMINDER": 0.35, "SCHEDULE_FOLLOWUP": 0.50, "HUMAN_ESCALATION": 0.40},
            "insufficient_funds": {"RETRY": 0.15, "PAYMENT_LINK": 0.72, "REMINDER": 0.55, "SCHEDULE_FOLLOWUP": 0.68, "HUMAN_ESCALATION": 0.45},
            "card_declined": {"RETRY": 0.08, "PAYMENT_LINK": 0.78, "REMINDER": 0.40, "SCHEDULE_FOLLOWUP": 0.60, "HUMAN_ESCALATION": 0.50},
            "card_expired": {"RETRY": 0.05, "PAYMENT_LINK": 0.82, "REMINDER": 0.45, "SCHEDULE_FOLLOWUP": 0.65, "HUMAN_ESCALATION": 0.50},
            "checkout_abandoned": {"RETRY": 0.15, "PAYMENT_LINK": 0.65, "REMINDER": 0.60, "SCHEDULE_FOLLOWUP": 0.55, "HUMAN_ESCALATION": 0.35},
            "user_cancelled": {"RETRY": 0.10, "PAYMENT_LINK": 0.50, "REMINDER": 0.40, "SCHEDULE_FOLLOWUP": 0.45, "HUMAN_ESCALATION": 0.30},
            "authentication_failed": {"RETRY": 0.78, "PAYMENT_LINK": 0.65, "REMINDER": 0.35, "SCHEDULE_FOLLOWUP": 0.50, "HUMAN_ESCALATION": 0.40}
        }
        prob = base.get(failure_reason, {}).get(action, 0.40)
        if retry_count >= 2:
            prob -= 0.30
        if historical_success_rate > 0.85:
            prob += 0.10
        return float(np.clip(prob, 0.05, 0.95))

    def evaluate_all_actions(self, customer_dict: Dict[str, Any], payment_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate expected recovery value for all candidate actions given customer and payment context.
        """
        amount_paisa = payment_dict.get("amount_paisa", 0)
        failure_reason = payment_dict.get("failure_reason", "bank_timeout")
        payment_method = payment_dict.get("payment_method", "upi")
        retry_count = payment_dict.get("retry_count", 0)
        
        results = []

        if self.model and self.feature_cols:
            # Vectorized model batch inference across all candidate actions
            rows = []
            for act in CANDIDATE_ACTIONS:
                row = {
                    "amount_paisa": amount_paisa,
                    "payment_method": payment_method,
                    "device_type": payment_dict.get("device_type", "mobile_android"),
                    "failure_reason": failure_reason,
                    "failure_code": payment_dict.get("failure_code", "BAD_REQUEST_ERROR"),
                    "customer_age": customer_dict.get("customer_age", 30),
                    "customer_lifetime_days": customer_dict.get("customer_lifetime_days", 100),
                    "customer_ltv_paisa": customer_dict.get("lifetime_value_paisa", 0),
                    "previous_transactions": customer_dict.get("total_transactions", 1),
                    "previous_successes": customer_dict.get("successful_transactions", 1),
                    "previous_failures": customer_dict.get("failed_transactions", 0),
                    "historical_success_rate": customer_dict.get("historical_success_rate", 1.0),
                    "previous_payment_method": customer_dict.get("preferred_payment_method", "upi"),
                    "retry_count": retry_count,
                    "subscription_status": payment_dict.get("subscription_status", "none"),
                    "checkout_duration_sec": payment_dict.get("checkout_duration_sec", 45),
                    "recovery_action": act
                }
                rows.append(row)

            df = pd.DataFrame(rows)
            X, _ = prepare_feature_matrix(df, is_training=False, feature_columns=self.feature_cols)
            probabilities = self.model.predict_proba(X)[:, 1]

            for i, act in enumerate(CANDIDATE_ACTIONS):
                prob = float(probabilities[i])
                exp_paisa = calculate_expected_recovery_paisa(amount_paisa, prob)
                results.append({
                    "action": act,
                    "probability": round(prob, 4),
                    "probability_pct": round(prob * 100, 1),
                    "expected_recovery_paisa": exp_paisa,
                    "expected_recovery_rupees": float(paisa_to_rupees(exp_paisa))
                })
        else:
            # Fallback evaluation
            for act in CANDIDATE_ACTIONS:
                prob = self._rule_based_fallback_probability(
                    failure_reason=failure_reason,
                    action=act,
                    retry_count=retry_count,
                    historical_success_rate=customer_dict.get("historical_success_rate", 1.0)
                )
                exp_paisa = calculate_expected_recovery_paisa(amount_paisa, prob)
                results.append({
                    "action": act,
                    "probability": round(prob, 4),
                    "probability_pct": round(prob * 100, 1),
                    "expected_recovery_paisa": exp_paisa,
                    "expected_recovery_rupees": float(paisa_to_rupees(exp_paisa))
                })

        # Sort actions by Expected Recovery Value descending
        results.sort(key=lambda x: x["expected_recovery_paisa"], reverse=True)
        best_recommendation = results[0]

        return {
            "recommended_action": best_recommendation["action"],
            "recommended_probability": best_recommendation["probability"],
            "recommended_expected_recovery_paisa": best_recommendation["expected_recovery_paisa"],
            "recommended_expected_recovery_rupees": best_recommendation["expected_recovery_rupees"],
            "all_actions": results,
            "model_used": self.model_name or "RuleBasedFallback"
        }

predictor = RecoveryPredictor()
