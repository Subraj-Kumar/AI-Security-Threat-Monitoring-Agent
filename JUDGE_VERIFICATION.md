# 🎯 FINAL SUBMISSION VERIFICATION CHECKLIST

**Project:** SecOPS - Security Operations Center Dashboard  
**Date:** May 24, 2026  
**Judge Access Time:** 5-10 minutes per verification

---

## ✅ PRE-SUBMISSION TESTS (Run These First)

### **1. Environment Verification**

- [ ] Python 3.14+ installed: `python --version` → 3.14.x or higher
- [ ] Node.js 18+ installed: `node --version` → 18.x or higher
- [ ] npm installed: `npm --version` → 8.x or higher
- [ ] Ports 3000 and 8000 are available/not blocked
- [ ] No firewall blocking localhost connections

### **2. Backend Health Check**

```bash
cd backend
python -m py_compile app/main.py
echo "Backend syntax check: $?"  # Should be 0 (no errors)
```

- [ ] No syntax errors in Python files
- [ ] All imports resolve correctly
- [ ] Pydantic schemas validate

### **3. Frontend Build Check**

```bash
cd frontend
npm run build
```

- [ ] Build completes in < 5 seconds
- [ ] No TypeScript errors
- [ ] No missing dependencies
- [ ] "Static" routes prerendered successfully

### **4. Startup Test**

**Terminal 1:**

```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Wait for: ✅ `INFO:     Application startup complete.`

**Terminal 2:**

```bash
cd frontend
npm run dev
```

Wait for: ✅ `✓ Ready in Xms`

- [ ] Backend starts without errors
- [ ] Frontend builds and starts without errors
- [ ] No port conflicts
- [ ] No module import failures

---

## 🎬 LIVE DEMO TESTS (In Order)

### **Test 1: Dashboard Home Page**

1. Open: http://localhost:3000
2. Expected:
   - [ ] Page loads with white background
   - [ ] "SecOPS" logo visible in header
   - [ ] "Incident Triage Queue" heading visible
   - [ ] KPI cards visible: Critical Threats (0), Active Incidents (0), System Status (Operational)
   - [ ] "Simulate Attack" button visible (orange)
   - [ ] Dropdown showing "Simulated Enterprise Traffic"
   - [ ] "Ingest Dataset" button visible (blue)
   - [ ] No console errors (F12)

### **Test 2: Synthetic Data Ingestion**

1. Click "Simulate Attack" button
2. Expected:
   - [ ] Button shows spinner while loading (< 5 seconds)
   - [ ] Incidents populate in table below KPIs
   - [ ] Critical Threats: 1 (red badge)
   - [ ] Active Incidents: ≥ 1
   - [ ] At least 1 "Critical" severity incident visible
   - [ ] Incidents show: Severity | Risk Score | Confidence | Incident Title | Last Seen | Investigate link
   - [ ] No errors in backend terminal

### **Test 3: Incident Detail Page**

1. Click "Investigate" link on any Critical incident
2. Expected:
   - [ ] Page loads with incident title
   - [ ] MITRE badges visible (T1110, T1078, etc.)
   - [ ] "Signals" section shows individual events
   - [ ] Status dropdown visible (Open / In Progress / Closed / Escalated)
   - [ ] Assignee dropdown visible
   - [ ] "Audit Log" section shows actions
   - [ ] "Case Notes" textarea available
   - [ ] "AI Summary" section present
   - [ ] Chat interface visible at bottom

### **Test 4: Dataset Selector**

1. Return to dashboard
2. Click dropdown (shows "Simulated Enterprise Traffic")
3. Expected:
   - [ ] All 4 options visible:
     - Simulated Enterprise Traffic
     - Splunk BOTS (AD/Auth CSV)
     - Splunk BOTS (Suricata IDS JSON)
     - 📡 Live Honeypot Stream
   - [ ] Can select each option
   - [ ] Button label changes based on selection

### **Test 5: Live Honeypot - Start**

1. Select "📡 Live Honeypot Stream" from dropdown
2. Click "Refresh Live Feed" button
3. Expected:
   - [ ] Button shows spinner (< 5 seconds)
   - [ ] "🎯 Honeypot Active" indicator appears (purple badge with pulsing dot)
   - [ ] "⛔ Stop" button appears next to indicator (red button)
   - [ ] Backend terminal shows: `INFO:     127.0.0.1:XXXX - "POST /honeypot/start HTTP/1.1" 200 OK`
   - [ ] No errors

### **Test 6: Live Honeypot - Trigger Attack**

1. From **separate terminal or device**:

   ```bash
   curl http://<your-ip>:8888
   ```

   (Use `ipconfig getifaddr en0` on Mac or `hostname -I` on Linux to get IP)

2. Expected:
   - [ ] curl shows: "Access Denied. Incident Logged."
   - [ ] Backend terminal shows honeypot captured connection:
     ```
     🚨 [CRITICAL ALERT] INCOMING CONNECTION BLOCKED FROM: XXX.XXX.XXX.XXX
     [!] Generating Custom APT29 Kill-Chain for IP: XXX.XXX.XXX.XXX...
     [*] Feeding raw telemetry to SecOPS Deterministic Engine...
     ✅ [SUCCESS] Attack successfully ingested from XXX.XXX.XXX.XXX!
     ```
   - [ ] Backend terminal shows: `POST /ingest/live HTTP/1.1" 200 OK`

### **Test 7: Live Honeypot - Dashboard Update**

1. Dashboard automatically refreshes or click "Refresh Live Feed" again
2. Expected:
   - [ ] **New Critical incident appears** with their IP
   - [ ] Incident title contains something like "Possible Brute Force Attack"
   - [ ] Risk score: 120
   - [ ] Confidence: 85%
   - [ ] MITRE tags show T1110 (Brute Force), T1078 (Valid Accounts)

### **Test 8: Live Honeypot - Stop**

1. Click "⛔ Stop" button
2. Expected:
   - [ ] Button shows spinner while stopping (< 2 seconds)
   - [ ] "🎯 Honeypot Active" indicator disappears
   - [ ] "⛔ Stop" button disappears
   - [ ] Backend terminal shows: `POST /honeypot/stop HTTP/1.1" 200 OK`
   - [ ] Dropdown resets to "Simulated Enterprise Traffic" (optional)

---

## 🔍 EDGE CASE TESTS

### **Test 9: Missing BOTS Files**

1. Select "Splunk BOTS (AD/Auth CSV)"
2. Click "Ingest Dataset"
3. Expected:
   - [ ] Alert shows: "❌ File not found: bots_subset.jsonl"
   - [ ] No crash or 500 error
   - [ ] Can retry with different dataset
   - [ ] Backend handled gracefully

### **Test 10: API Documentation**

1. Open: http://127.0.0.1:8000/docs
2. Expected:
   - [ ] Swagger UI loads
   - [ ] All endpoints visible:
     - POST /ingest/dataset/{dataset_type}
     - GET /incidents
     - GET /incidents/{id}
     - POST /incidents/{id}/action
     - POST /incidents/{id}/chat
     - POST /honeypot/start
     - POST /honeypot/stop
     - GET /honeypot/status

### **Test 11: Browser Console**

1. During all demo steps, press F12 (Developer Tools)
2. Check "Console" tab
3. Expected:
   - [ ] No red errors
   - [ ] Only info/warning logs (no violations)
   - [ ] No CORS issues

### **Test 12: Network Tab**

1. During demo, check "Network" tab in Dev Tools
2. Expected:
   - [ ] All API calls return 200 OK
   - [ ] No 404 errors
   - [ ] No timeout errors
   - [ ] Response times < 2 seconds for most requests

---

## ✅ DEMONSTRATION QUALITY CHECKS

### **Visual Quality**

- [ ] UI looks professional (not amateur/sketch)
- [ ] Colors are consistent (blue accents, orange highlights)
- [ ] Fonts render correctly (not blurry/broken)
- [ ] Responsive on desktop (tested)
- [ ] Buttons are clickable and provide visual feedback
- [ ] No typos or grammar errors in UI text

### **Performance**

- [ ] Dashboard loads in < 3 seconds
- [ ] Incident detail loads in < 2 seconds
- [ ] No lag when clicking buttons
- [ ] Animations are smooth (not janky)
- [ ] Chat works without lag

### **Data Accuracy**

- [ ] Incident titles make sense (not gibberish)
- [ ] MITRE tags are correct for attack type
- [ ] Risk scores align with incident severity
- [ ] Timestamps are reasonable
- [ ] IP addresses appear correctly in honeypot incidents

### **Completeness**

- [ ] All promised features work as described
- [ ] No "TODO" comments visible in UI
- [ ] All buttons are functional (not dummy)
- [ ] No incomplete workflows

---

## 🚨 FAILURE SCENARIOS - Recovery Steps

### **If Backend Won't Start**

1. Check: `python --version` → Must be 3.14+
2. Run: `pip install -r requirements.txt --upgrade`
3. Delete: `backend/__pycache__` directories
4. Try again: `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`

### **If Frontend Won't Build**

1. Check: `node --version` → Must be 18+
2. Run: `npm cache clean --force`
3. Run: `rm -rf node_modules package-lock.json`
4. Run: `npm install`
5. Try: `npm run dev`

### **If Port 8000 is Busy**

1. Find process: `netstat -ano | findstr :8000` (Windows)
2. Kill process: `taskkill /PID <PID> /F` (Windows)
3. Or change port in `backend/app/main.py`

### **If Dashboard Shows No Data**

1. Check backend terminal for errors
2. Verify API response: `curl http://127.0.0.1:8000/incidents`
3. Should return: `[]` (empty array) or array of incident objects

### **If Honeypot Button Doesn't Appear**

1. Verify browser cache cleared (Ctrl+Shift+Delete)
2. Try full refresh: `Ctrl+F5`
3. Check browser console (F12) for JavaScript errors
4. Restart frontend: `npm run dev`

---

## 📋 FINAL CHECKLIST (Before Judge Sees It)

- [ ] Both terminals showing "ready" messages
- [ ] Dashboard loads at http://localhost:3000
- [ ] Browser console has no red errors
- [ ] All 4 tests above pass (synthetic, detail, honeypot, stop)
- [ ] Backend terminal shows no error logs
- [ ] Demo scenario can be completed in < 10 minutes
- [ ] All judges' tools ready to demo (device for curl test, etc.)
- [ ] Contingency plan if something fails mid-demo

---

## 🎤 DEMO SCRIPT FOR JUDGES (Word-for-word)

> _"Hello! We're excited to show you SecOPS, an AI-powered Security Operations Center dashboard. It combines deterministic alert clustering with Gemini AI to cut through SOC noise and surface only verified threats._
>
> _Here's what we're about to demonstrate:_
>
> _First, we'll ingest 1,220 realistic enterprise telemetry events and show how our engine filters 99%+ noise to surface just 5 verified incidents. One of them is a Critical brute-force attack._
>
> _Next, we'll click into that incident and show the AI-generated summary of the attack chain, complete with MITRE ATT&CK mappings._
>
> _Finally—and this is the cool part—we'll start our live honeypot right from this dashboard. When someone tries to connect to it from another device, we'll capture their real IP, generate a custom APT29 kill-chain telemetry package, and ingest it live. The dashboard will auto-refresh with a new incident showing exactly what they did._
>
> _Let's start..._"

Then follow **Test 2 through 8** above. Total demo time: 5-7 minutes.

---

**✅ VERIFICATION COMPLETE**

If all tests pass, you're ready for final submission.

**Good luck! 🚀**
