# ⚡ JUDGES QUICK START CARD

**Project:** SecOPS - AI-Powered SOC Co-Pilot  
**Status:** ✅ READY TO DEMO

---

## 🚀 LAUNCH (Pick One)

### **Option A: Windows (Easiest)**

```
1. Open file: START.bat
2. Double-click it
3. Two windows open automatically
4. Go to: http://localhost:3000
```

### **Option B: Manual (Any OS)**

```
Terminal 1 (Backend):
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Terminal 2 (Frontend):
cd frontend
npm run dev

Then: http://localhost:3000
```

---

## ✨ DEMO (5 Minutes)

### **Phase 1: Data Ingest** (1 min)

1. Click "**Simulate Attack**" button (orange)
2. Dashboard populates with 1 Critical incident
3. Show KPI: "1,220 events ingested, 5 incidents, 99.7% filtered"

### **Phase 2: Investigation** (1.5 min)

1. Click "**Investigate**" on Critical incident
2. See MITRE tags, attack timeline, AI summary
3. Try chatting with Gemini about the attack

### **Phase 3: Live Honeypot** (2 min)

1. Back to dashboard
2. Select "**📡 Live Honeypot Stream**" dropdown
3. Click "**Refresh Live Feed**"
4. "🎯 Honeypot Active" appears with "⛔ Stop" button
5. **[From separate device]:** `curl http://<your-ip>:8888`
6. Dashboard auto-refreshes with new incident (YOUR IP!)
7. Click "⛔ Stop"

### **Phase 4: Cleanup** (30 sec)

1. Show "Honeypot Active" indicator vanishes
2. Dashboard still shows all incidents

---

## 🎯 WHAT YOU'RE SEEING

| What                                  | Why It Matters                         |
| ------------------------------------- | -------------------------------------- |
| **1,220 Events → 5 Incidents**        | 99% noise filtering works              |
| **MITRE Tags (T1110, T1078, T1068)**  | Enterprise compliance                  |
| **Your Real IP in Honeypot Incident** | Not simulated—real detection           |
| **AI Synthesis**                      | Gemini auto-generates attack narrative |
| **Status/Assignee Controls**          | Full case management (not just alerts) |
| **Audit Log**                         | Every action timestamped               |

---

## 🛑 TROUBLESHOOTING (If Needed)

| Problem                 | Fix                                         |
| ----------------------- | ------------------------------------------- |
| Backend won't start     | `pip install -r requirements.txt --upgrade` |
| Frontend won't build    | `npm install` then `npm run dev`            |
| Port 8000 busy          | Close other processes or change port        |
| Honeypot button missing | Hard refresh (Ctrl+Shift+Delete)            |
| No incidents showing    | Check backend terminal for errors           |

---

## 📋 KEY FILES

| File                      | Purpose                                |
| ------------------------- | -------------------------------------- |
| **JUDGE_VERIFICATION.md** | Full test suite (read if issues arise) |
| **FINAL_SUMMARY.md**      | Executive summary                      |
| **README.md**             | Project overview                       |
| **FILES_MANIFEST.md**     | What changed and why                   |

---

## ✅ DEMO QUALITY

- ✅ Professional light-themed UI
- ✅ Responsive (works on mobile/tablet/desktop)
- ✅ All buttons functional
- ✅ No console errors
- ✅ Live IP capture (not mocked)
- ✅ Real Gemini AI integration
- ✅ Enterprise workflow features

---

## 📞 SUPPORT

**Questions?** Read: **JUDGE_VERIFICATION.md**  
(Complete troubleshooting guide included)

**API Docs?** Open: **http://127.0.0.1:8000/docs**  
(Auto-generated Swagger UI)

---

**STATUS: 🎉 PRODUCTION READY FOR DEMO**

**Estimated Demo Time: 5-7 minutes**  
**Setup Time: 2 minutes max**  
**Total: ~10 minutes**
