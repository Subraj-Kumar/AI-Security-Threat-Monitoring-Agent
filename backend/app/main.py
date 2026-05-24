import os
import uuid
import json
import csv
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.models.schemas import (
    LogEvent, IncidentDetail, IngestResult, ChatRequest, ChatResponse, IncidentActionRequest, AuditEntry
)

load_dotenv()

app = FastAPI(title="SOC Co-Pilot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows easy Next.js frontend linking
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST SCHEMAS ---
class LiveIngestRequest(BaseModel):
    """Receives dynamically generated live attack events from the honeypot."""
    events: List[Dict[str, Any]]

# --- IN-MEMORY DATABASE ---
DB = {
    "events": {},     # id -> LogEvent
    "incidents": {}   # id -> IncidentDetail
}

DB_FILE = "db.json"

def save_db():
    """Flushes state to local disk so your work isn't lost on reload."""
    with open(DB_FILE, "w") as f:
        json.dump({
            "events": {k: v.model_dump(mode="json") for k, v in DB["events"].items()},
            "incidents": {k: v.model_dump(mode="json") for k, v in DB["incidents"].items()}
        }, f, indent=2)

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                data = json.load(f)
                for k, v in data.get("events", {}).items():
                    DB["events"][k] = LogEvent(**v)
                for k, v in data.get("incidents", {}).items():
                    DB["incidents"][k] = IncidentDetail(**v)
        except Exception:
            pass

load_db()

# --- STEP 4 & 5: DETECT, SCORE & GROUP ---
def run_analytics_pipeline(new_events: List[LogEvent]):
    """Processes newly ingested events, scores them, and groups into incidents."""
    # Group events by sliding window (15 minutes) and entity (username or IP)
    # For hackathon scale, we sort events and look for clusters
    all_events = list(DB["events"].values()) + new_events
    all_events.sort(key=lambda x: x.ts)
    
    # Store temporary clusters
    clusters: List[List[LogEvent]] = []
    
    for evt in all_events:
        placed = False
        for cluster in clusters:
            # Check if event shares identity and is within 15m of cluster window
            match_user = (evt.username and any(c.username == evt.username for c in cluster))
            match_ip = (evt.ip and any(c.ip == evt.ip for c in cluster))
            
            time_match = any(abs((evt.ts - c.ts).total_seconds()) <= 900 for c in cluster)
            
            if (match_user or match_ip) and time_match:
                cluster.append(evt)
                placed = True
                break
        if not placed:
            clusters.append([evt])
            
    # Process clusters into formal structured incidents
    new_incidents = {}
    for cluster in clusters:
        # 1. Run Rule Logic
        signals = []
        score = 0
        
        login_fails = [c for c in cluster if c.event_type == "LOGIN_FAIL"]
        login_successes = [c for c in cluster if c.event_type == "LOGIN_SUCCESS"]
        mfa_fails = [c for c in cluster if c.event_type == "MFA_FAIL"]
        priv_escs = [c for c in cluster if c.event_type == "PRIV_ESC"]
        
        if len(login_fails) >= 5:
            signals.append({"rule_name": "Brute Force Pattern", "points": 40, "evidence": f"{len(login_fails)} failures detected"})
            score += 40
            
        if login_fails and login_successes:
            first_fail = min(c.ts for c in login_fails)
            last_success = max(c.ts for c in login_successes)
            if last_success > first_fail:
                signals.append({"rule_name": "Success After Failure Burst", "points": 30, "evidence": "Successful auth after dynamic block of failures"})
                score += 30
                
        if len(mfa_fails) >= 3:
            signals.append({"rule_name": "MFA Fatigue Spike", "points": 25, "evidence": f"{len(mfa_fails)} consecutive MFA drops"})
            score += 25
            
        if priv_escs:
            signals.append({"rule_name": "Unauthorized Privilege Escalation", "points": 50, "evidence": "Sensitive execution block target encountered"})
            score += 50

        if score == 0:
            continue  # Ignore completely benign event singletons for demo cleanliness

        # Determine structural metrics
        severity = "low"
        if score >= 90: severity = "critical"
        elif score >= 70: severity = "high"
        elif score >= 40: severity = "medium"
        
        confidence = 0.4
        if len(signals) >= 2: confidence = 0.85
        elif score >= 50: confidence = 0.70

        users = list(set([c.username for c in cluster if c.username]))
        ips = list(set([c.ip for c in cluster if c.ip]))
        
        cluster.sort(key=lambda x: x.ts)
        inc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{users or ips}-{cluster[0].ts.isoformat()}"))
        
        # --- NEW: MITRE Mapping & Initial Audit Log ---
        mitre_tags = []
        if len(login_fails) >= 5: 
            mitre_tags.append("T1110 - Brute Force")
        if priv_escs: 
            mitre_tags.append("T1068 - Privilege Escalation")
        if login_fails and login_successes and max(c.ts for c in login_successes) > min(c.ts for c in login_fails):
            mitre_tags.append("T1078 - Valid Accounts")
        
        initial_audit = [AuditEntry(
            timestamp=datetime.utcnow(), 
            action="Incident generated by SecOPS Deterministic Engine", 
            user="System"
        )]
        
        title = "Suspicious Authentication Activity"
        if len(login_fails) >= 5: title = f"Possible Brute Force Attack targeting {users[0] if users else 'Unknown'}"
        elif priv_escs: title = f"Critical Privilege Escalation Vector by {users[0] if users else 'Unknown'}"

        # Preserve AI summary if already generated previously
        existing = DB["incidents"].get(inc_id)
        explanation = existing.explanation if existing else None

        new_incidents[inc_id] = IncidentDetail(
            id=inc_id,
            title=title,
            severity=severity,
            score=score,
            confidence=confidence,
            entities={"users": users, "ips": ips},
            first_seen=cluster[0].ts,
            last_seen=cluster[-1].ts,
            event_count=len(cluster),
            signals=signals,
            events=cluster,
            explanation=explanation,
            mitre_tags=mitre_tags,
            audit_log=initial_audit
        )
        
    DB["incidents"] = new_incidents
    # Commit all changes to memory indices
    for e in new_events:
        DB["events"][e.id] = e
    save_db()

# --- SYSTEM HEALTH ---
@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# --- INGESTION ENDPOINTS ---
@app.post("/ingest/dataset/{dataset_type}", response_model=IngestResult)
def ingest_dataset(dataset_type: str):
    """Unified dynamic endpoint for ingesting multiple dataset types."""
    events = []
    base_dir = os.path.dirname(__file__)
    
    # Clear the DB for fresh ingestion
    DB["incidents"].clear()
    DB["events"].clear()
    
    if dataset_type == "synthetic":
        # SYNTHETIC: Enterprise telemetry JSONL
        file_path = os.path.join(base_dir, "data", "enterprise_telemetry.jsonl")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="synthetic file not found in data folder.")
        
        with open(file_path, "r") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    evt = LogEvent(
                        id=str(uuid.uuid4()),
                        ts=datetime.fromisoformat(item["ts"]),
                        source=item["source"],
                        event_type=item["event_type"],
                        username=item.get("username"),
                        ip=item.get("ip"),
                        raw=item["raw"]
                    )
                    events.append(evt)
    
    elif dataset_type == "bots-auth":
        # BOTS AUTH: Windows Event Log CSV with EventCode mapping
        file_path = os.path.join(base_dir, "data", "bots_real_auth.csv")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="BOTS CSV not found.")
            
        event_mapping = {"4625": "LOGIN_FAIL", "4624": "LOGIN_SUCCESS", "4728": "PRIV_ESC", "4732": "PRIV_ESC"}
        
        with open(file_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                event_id = row.get("EventCode", "")
                if event_id in event_mapping:
                    user = row.get("Account_Name", "Unknown")
                    ip = row.get("Source_Network_Address", "127.0.0.1")
                    if ip == "-" or not ip: ip = "Unknown IP"
                    
                    evt = LogEvent(
                        id=str(uuid.uuid4()),
                        ts=datetime.fromisoformat(row.get("_time", datetime.utcnow().isoformat()).replace("Z", "+00:00")),
                        source="windows_wineventlog",
                        event_type=event_mapping[event_id],
                        username=user,
                        ip=ip,
                        raw=f"EventCode={event_id} | {row.get('Message', '')[:100]}..."
                    )
                    events.append(evt)
    
    elif dataset_type == "suricata":
        # SURICATA: IDS JSON lines
        file_path = os.path.join(base_dir, "data", "bots_suricata.jsonl")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="suricata file not found in data folder.")
        
        with open(file_path, "r") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    signature = item.get("alert", {}).get("signature", "IDS Alert")
                    
                    evt = LogEvent(
                        id=str(uuid.uuid4()),
                        ts=datetime.fromisoformat(item.get("timestamp", datetime.utcnow().isoformat())),
                        source="suricata",
                        event_type="IDS_ALERT",
                        username=None,
                        ip=item.get("src_ip"),
                        raw=f"Alert: {signature}"
                    )
                    events.append(evt)
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown dataset type: {dataset_type}")
    
    # Process through the analytics pipeline
    before_incidents = len(DB["incidents"])
    run_analytics_pipeline(events)
    after_incidents = len(DB["incidents"])
    
    return {
        "status": "success",
        "ingested_events": len(events),
        "created_incidents": after_incidents - before_incidents
    }

@app.post("/ingest/live", response_model=IngestResult)
def ingest_live_attack(payload: LiveIngestRequest):
    """Receives dynamically generated attacks directly from the Honeypot."""
    events = []
    
    for item in payload.events:
        evt = LogEvent(
            id=str(uuid.uuid4()),
            ts=datetime.fromisoformat(item["ts"]),
            source=item["source"],
            event_type=item["event_type"],
            username=item.get("username"),
            ip=item.get("ip"),
            raw=item["raw"]
        )
        events.append(evt)
            
    # Clear the DB so the dashboard updates with exactly this attack
    DB["incidents"].clear()
    DB["events"].clear()
    
    before_incidents = len(DB["incidents"])
    run_analytics_pipeline(events) 
    after_incidents = len(DB["incidents"])
    
    return {
        "status": "success",
        "ingested_events": len(events),
        "created_incidents": after_incidents - before_incidents
    }

# --- INCIDENT RETRIEVAL ---
@app.get("/incidents")
def get_incidents():
    # Sort critical -> high -> medium -> low
    sev_weights = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    inc_list = list(DB["incidents"].values())
    inc_list.sort(key=lambda x: (sev_weights.get(x.severity, 0), x.score), reverse=True)
    return inc_list

@app.get("/incidents/{incident_id}", response_model=IncidentDetail)
def get_incident_detail(incident_id: str):
    if incident_id not in DB["incidents"]:
        raise HTTPException(status_code=404, detail="Incident identity signature not matched")
    return DB["incidents"][incident_id]

# --- STEP 6: AI GEMINI ANALYSIS ENGINE ---
@app.post("/incidents/{incident_id}/explain")
def explain_incident(incident_id: str):
    if incident_id not in DB["incidents"]:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident = DB["incidents"][incident_id]
    
    # Return cached response instantly for lightning-fast presentation deck pacing
    if incident.explanation:
        return incident.explanation

    # Standard SDK instantiation for 2026
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"summary": "AI Disabled: Missing API configuration signature token.", "recommended_actions": ["Verify deployment environment flags."]}

    client = genai.Client()
    
    prompt = f"""
    You are an expert enterprise Tier-3 SOC Analyst. Review this technical security incident package:
    {json.dumps(incident.model_dump(mode="json"), indent=2)}

    Generate a highly accurate summary context mapping explaining the vector directly.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "summary": types.Schema(type=types.Type.STRING),
                        "why_flagged": types.Schema(type=types.Type.STRING),
                        "likely_attack_pattern": types.Schema(type=types.Type.STRING),
                        "recommended_actions": types.Schema(
                            type=types.Type.ARRAY, 
                            items=types.Schema(type=types.Type.STRING)
                        ),
                    },
                    required=["summary", "why_flagged", "likely_attack_pattern", "recommended_actions"]
                ),
                temperature=0.1
            ),
        )
        
        structured_output = json.loads(response.text)
        incident.explanation = structured_output
        save_db()
        return structured_output
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Synthesis Interruption: {str(e)}")

@app.post("/incidents/{incident_id}/chat", response_model=ChatResponse)
def chat_incident(incident_id: str, payload: ChatRequest):
    if incident_id not in DB["incidents"]:
        raise HTTPException(status_code=404, detail="Incident context tracking missed")
        
    incident = DB["incidents"][incident_id]
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"answer": "Gemini runtime offline. Please check your .env file.", "citations": []}

    client = genai.Client()
    
    prompt = f"""
    Context: {json.dumps(incident.model_dump(mode="json"), indent=2)}
    User Query regarding this incident: "{payload.question}"
    
    Provide an accurate response based strictly on the events timeline metadata above. Include data matching validation citations.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "answer": types.Schema(type=types.Type.STRING),
                        "citations": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING))
                    },
                    required=["answer", "citations"]
                ),
                temperature=0.2
            )
        )
        
        # --- BULLETPROOF JSON PARSING ---
        # Gemini sometimes returns markdown code blocks even when asked for JSON.
        # This strips the ```json and ``` tags safely.
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:-3].strip()
            
        return json.loads(raw_text)
        
    except Exception as e:
        # Print the exact error to your Python terminal so you can read it
        print(f"🔥 GEMINI CHAT ERROR: {str(e)}") 
        
        # Return the exact error to the frontend chat bubble instead of throwing a 500 crash
        return {
            "answer": f"⚠️ Backend AI Exception: {str(e)}", 
            "citations": ["System Error Catch"]
        }

# --- TRIAGE WORKFLOW ACTIONS ---
@app.patch("/incidents/{incident_id}/action")
def perform_incident_action(incident_id: str, payload: IncidentActionRequest):
    """Update incident status, assignee, or add case notes to the audit trail."""
    if incident_id not in DB["incidents"]:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident = DB["incidents"][incident_id]
    
    if payload.action_type == "status":
        incident.status = payload.value
        action_desc = f"Changed status to {payload.value}"
    elif payload.action_type == "assignee":
        incident.assignee = payload.value
        action_desc = f"Assigned incident to {payload.value}"
    elif payload.action_type == "note":
        action_desc = f"Added note: {payload.value}"
    else:
        raise HTTPException(status_code=400, detail="Invalid action type")
        
    incident.audit_log.append(AuditEntry(
        timestamp=datetime.utcnow(),
        action=action_desc,
        user=payload.user
    ))
    
    save_db()
    return {"status": "success", "incident": incident}