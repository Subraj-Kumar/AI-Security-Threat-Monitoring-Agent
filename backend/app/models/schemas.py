from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any

# --- EVENT SCHEMAS ---
class LogEvent(BaseModel):
    id: str
    ts: datetime
    source: str  # auth, vpn, endpoint
    event_type: str  # LOGIN_FAIL, LOGIN_SUCCESS, MFA_FAIL, PRIV_ESC
    username: Optional[str] = None
    ip: Optional[str] = None
    device: Optional[str] = None
    location: Optional[str] = None
    raw: str

# --- INCIDENT SCHEMAS ---
class Signal(BaseModel):
    rule_name: str
    points: int
    evidence: str

class AuditEntry(BaseModel):
    timestamp: datetime
    action: str
    user: str

class IncidentListItem(BaseModel):
    id: str
    title: str
    severity: str  # low, medium, high, critical
    score: int
    confidence: float
    entities: Dict[str, List[str]]  # {"users": [...], "ips": [...]}
    first_seen: datetime
    last_seen: datetime
    event_count: int
    status: str = "open"
    assignee: str = "Unassigned"

class IncidentDetail(IncidentListItem):
    signals: List[Signal]
    explanation: Optional[Dict[str, Any]] = None
    events: List[LogEvent]
    mitre_tags: List[str] = []
    audit_log: List[AuditEntry] = []
    threat_intel_enrichment: List[str] = []  # Threat intel hits (e.g., "🔴 Known APT Group")

# --- API REQUEST/RESPONSE SCHEMAS ---
class IngestResult(BaseModel):
    status: str
    ingested_events: int
    created_incidents: int

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    citations: List[str]

class IncidentActionRequest(BaseModel):
    action_type: str  # 'status', 'assignee', or 'note'
    value: str
    user: str = "Analyst-1"