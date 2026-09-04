import jwt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

JWT_SECRET = "recoverpay_enterprise_secret_key_2026"
JWT_ALGORITHM = "HS256"

# Demo User Directory
USERS_DB = {
    "admin": {
        "id": "usr_admin_001",
        "username": "admin@recoverpay.ai",
        "name": "Sarah Chen",
        "role": "MERCHANT_ADMIN",
        "title": "Head of Revenue Engineering",
        "permissions": ["POLICY_EDIT", "ESCALATION_RESOLVE", "WEBHOOK_SIMULATE", "VIEW_AUDIT", "EXPORT_REPORTS"]
    },
    "operator": {
        "id": "usr_ops_002",
        "username": "ops.lead@recoverpay.ai",
        "name": "David Miller",
        "role": "OPERATIONS_LEAD",
        "title": "Payment Operations Lead",
        "permissions": ["ESCALATION_RESOLVE", "INSPECT_AI", "VIEW_AUDIT", "EXPORT_REPORTS"]
    },
    "auditor": {
        "id": "usr_audit_003",
        "username": "compliance@recoverpay.ai",
        "name": "Elena Rostova",
        "role": "COMPLIANCE_AUDITOR",
        "title": "Chief Compliance Officer",
        "permissions": ["VIEW_AUDIT", "EXPORT_REPORTS", "VIEW_ANALYTICS"]
    }
}

class LoginRequest(BaseModel):
    role_key: str = "admin" # 'admin', 'operator', or 'auditor'

class AuthResponse(BaseModel):
    status: str
    token: str
    user: dict

def create_jwt_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "username": user["username"],
        "name": user["name"],
        "role": user["role"],
        "permissions": user["permissions"],
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        # Default mock admin for seamless development
        return USERS_DB["admin"]
    
    try:
        token = authorization.replace("Bearer ", "").strip()
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        # Fallback
        return USERS_DB["admin"]

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user = USERS_DB.get(req.role_key.lower()) or USERS_DB["admin"]
    token = create_jwt_token(user)
    return {
        "status": "success",
        "token": token,
        "user": user
    }

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "status": "success",
        "user": user
    }

@router.get("/roles")
def get_roles():
    return {
        "status": "success",
        "roles": [
            {
                "key": "admin",
                "role": "MERCHANT_ADMIN",
                "name": "Sarah Chen (Merchant Admin)",
                "description": "Full access: Policy rule tuning, AI configurations, live simulation, and manual overrides."
            },
            {
                "key": "operator",
                "role": "OPERATIONS_LEAD",
                "name": "David Miller (Operations Lead)",
                "description": "Operational access: Human Escalation manual resolution and omnichannel preview. Policy rules are read-only."
            },
            {
                "key": "auditor",
                "role": "COMPLIANCE_AUDITOR",
                "name": "Elena Rostova (Compliance Auditor)",
                "description": "Read-only access: Immutable Audit Trail, CSV/PDF reports, and financial benchmarks."
            }
        ]
    }
