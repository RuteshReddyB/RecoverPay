import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.db.firebase import get_db
from backend.services.db_service import PolicyRepository
from backend.utils.logger import logger
from backend.api.prediction import router as prediction_router
from backend.api.recovery import router as recovery_router
from backend.api.webhooks import router as webhook_router
from backend.api.agent import router as agent_router
from backend.api.analytics import router as analytics_router
from backend.api.policy import router as policy_router
from backend.api.export import router as export_router

app = FastAPI(
    title="RecoverPay AI - Autonomous Revenue Recovery API",
    description="Autonomous payment recovery agent using Razorpay Test APIs, ML, and Policy Engine",
    version="1.0.0"
)

app.include_router(prediction_router)
app.include_router(recovery_router)
app.include_router(webhook_router)
app.include_router(agent_router)
app.include_router(analytics_router)
app.include_router(policy_router)
app.include_router(export_router)

# Enable CORS for React frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming Request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response: {request.method} {request.url.path} -> Status {response.status_code}")
    return response

@app.get("/")
def root():
    return {
        "app": "RecoverPay AI",
        "status": "online",
        "track": "Razorpay AI Buildathon Track 03",
        "tagline": "Detect -> Diagnose -> Decide -> Recover -> Measure"
    }

@app.get("/api/health")
def health_check():
    db_client, is_mock = get_db()
    policy = PolicyRepository.get_policy()
    
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database": {
            "type": "Firebase Firestore",
            "mock_mode": is_mock,
            "connected": db_client is not None
        },
        "environment": settings.ENVIRONMENT,
        "default_policies": {
            "max_auto_recovery_amount_paisa": policy.max_auto_recovery_amount_paisa,
            "max_auto_recovery_amount_rupees": policy.max_auto_recovery_amount_rupees,
            "max_retry_attempts": policy.max_retry_attempts,
            "min_recovery_probability": policy.min_recovery_probability,
            "auto_recovery_enabled": policy.auto_recovery_enabled
        }
    }
