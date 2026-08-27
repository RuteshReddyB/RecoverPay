import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Firebase settings
    FIREBASE_PROJECT_ID: str = "recoverpayai"
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None
    FIREBASE_CREDENTIALS_PATH: Optional[str] = "firebase-credentials.json"
    FIREBASE_MOCK_MODE: bool = False

    # Razorpay credentials
    RAZORPAY_KEY_ID: str = "rzp_test_mockkey123"
    RAZORPAY_KEY_SECRET: str = "mocksecret456"
    RAZORPAY_WEBHOOK_SECRET: str = "webhooksecret789"

    # Default Merchant Policies (all amounts in integer paisa)
    DEFAULT_MAX_AUTO_RECOVERY_AMOUNT_PAISA: int = 1000000  # ₹10,000.00
    DEFAULT_MAX_RETRY_ATTEMPTS: int = 2
    DEFAULT_MIN_RECOVERY_PROBABILITY: float = 0.40
    DEFAULT_MAX_CONTACT_ATTEMPTS: int = 2

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
