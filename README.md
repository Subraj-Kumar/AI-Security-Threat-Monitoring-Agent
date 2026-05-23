# 🛡️ SecOPS: AI-Powered SOC Co-Pilot

> **An intelligent, deterministic-first Security Operations Center (SOC) Co-Pilot that cuts through SIEM noise, prioritizes alerts, and uses AI to synthesize complex attack vectors into actionable playbooks.**

![Next.js](https://img.shields.io/badge/Next.js-Black?logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?logo=google&logoColor=white)

## 🚀 The Problem: Alert Fatigue
Security Operations Centers are drowning in noise. Analysts spend hours manually correlating thousands of raw telemetry logs across different systems just to determine if a threat is a false positive or a critical breach. Gartner reports that up to 45% of security incidents are never investigated because analysts are suffering from severe alert fatigue.

## 💡 Our Solution: Hybrid Architecture
**SecOPS** acts as a Tier-3 analyst multiplier. Instead of relying purely on expensive and hallucination-prone AI to "find" threats, we use a hybrid architecture:

1. **Deterministic Rules Engine:** Fast, mathematical algorithms parse raw logs, group them by entity (User/IP) over time windows, and score them based on hardcoded security heuristics (e.g., Brute Force, Impossible Travel, Privilege Escalation).
2. **AI Co-Pilot (Gemini 2.5):** Once an incident is confidently grouped and scored, we pass the bounded context to **Google Gemini** to translate the raw JSON into a plain-English executive summary, map it to MITRE ATT&CK patterns, and allow analysts to interrogate the logs via natural language chat.

---

## ✨ Key Features

* **Real-Time Noise Reduction:** Ingests thousands of logs and filters out 99%+ of background noise, surfacing only mathematically verified attack vectors.
* **Automated MITRE Mapping:** Automatically tags incidents with MITRE ATT&CK framework IDs (e.g., T1110 for Brute Force).
* **AI Executive Synthesis:** Translates complex JSON telemetry into plain-English summaries and recommended remediation playbooks.
* **Contextual Chat Sandbox:** Chat directly with the incident logs. The AI cites exact timestamps and event IDs to prevent hallucinations.
* **Enterprise Case Management:** Built-in workflow status, assignee tracking, and an immutable Analyst Audit Log.
* **1-Click Remediation Export:** Generates a formatted Markdown report for seamless Jira/Ticketing integration.

---

## ⚙️ How It Works (Data Flow)

1. **Ingestion & Normalization:** Standardizes messy raw logs (auth, endpoints, VPNs) into a clean, typed schema.
2. **Correlation & Scoring:** Groups events by sliding 15-minute time-windows and assigns Risk Scores based on triggered signals.
3. **Prioritized Queue:** Surfaces a triage dashboard ranking incidents by Severity (Critical -> Low) and AI Confidence.
4. **Investigation Sandbox:** A dedicated deep-dive view where analysts can review the chronological telemetry and trigger the AI agent.

---

## 🚦 Quickstart (Run it Locally)

### 1. Setup the Backend API
Navigate to the `backend` directory, install dependencies, and run the traffic generator:
```bash
cd backend
pip install -r requirements.txt

# IMPORTANT: Create a .env file in the backend folder and add your API key:
# GEMINI_API_KEY=your_actual_key_here

# Generate the 1,200+ event realistic dataset:
python generate_traffic.py

# Start the server:
uvicorn app.main:app --reload --port 8000
