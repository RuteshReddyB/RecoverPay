import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from backend.ml.predictor import predictor
from backend.services.db_service import CustomerRepository, PaymentRepository

router = APIRouter(prefix="/api/prediction", tags=["Prediction"])

class PredictRequest(BaseModel):
    customer_id: Optional[str] = None
    payment_id: Optional[str] = None
    customer_details: Optional[Dict[str, Any]] = None
    payment_details: Optional[Dict[str, Any]] = None

@router.post("/predict")
def predict_action_probabilities(request: PredictRequest):
    customer_data = request.customer_details or {}
    payment_data = request.payment_details or {}

    # If customer_id provided, fetch from DB repository
    if request.customer_id:
        cust = CustomerRepository.get_customer(request.customer_id)
        if cust:
            customer_data.update(cust.model_dump())

    # If payment_id provided, fetch from DB repository
    if request.payment_id:
        pmt = PaymentRepository.get_payment(request.payment_id)
        if pmt:
            payment_data.update(pmt.model_dump())

    if not payment_data.get("amount_paisa"):
        payment_data["amount_paisa"] = 499900  # Default ₹4,999 fallback

    evaluation = predictor.evaluate_all_actions(customer_data, payment_data)
    return {
        "status": "success",
        "customer_id": request.customer_id,
        "payment_id": request.payment_id,
        "prediction": evaluation
    }

@router.get("/metrics")
def get_model_metrics():
    metrics_path = "models/model_metrics.json"
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            data = json.load(f)
        return {"status": "success", "metrics": data}
    else:
        return {
            "status": "warning",
            "message": "Model training metrics file not found. Please execute backend/ml/train.py",
            "metrics": None
        }
