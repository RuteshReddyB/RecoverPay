from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
import hashlib
import json
import datetime

class AuditLogCreate(BaseModel):
    event_id: str
    entity_type: str
    entity_id: str
    actor: str  # SYSTEM, AGENT, POLICY_ENGINE, MERCHANT, WEBHOOK
    action: str
    details: Dict[str, Any]

class AuditLogSchema(AuditLogCreate):
    id: str
    hash: str
    timestamp: str

    @staticmethod
    def generate_hash(event_id: str, actor: str, action: str, details: Dict[str, Any], timestamp: str) -> str:
        payload = f"{event_id}:{actor}:{action}:{json.dumps(details, sort_keys=True)}:{timestamp}"
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()
