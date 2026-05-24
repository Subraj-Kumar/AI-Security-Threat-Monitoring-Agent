# 🚀 Cloud Deployment Guide (Vercel + Render)

**Total Time:** ~15 minutes  
**Cost:** Free tier available  
**Result:** Production links for judges

---

## ⚠️ Important: Live Demo vs. Deployed Links

### **For Live Presentation (Recommended)**

- Run locally: `START.bat` or `bash START.sh`
- Use: `http://localhost:3000`
- Honeypot captures real teammate IPs perfectly
- Zero latency, 100% reliable
- **This is best for impressing judges in real-time**

### **For Portfolio / Submission Links**

- Deploy to cloud (this guide)
- Share Vercel + Render links with judges
- Honeypot will capture random internet bots (still works, but not local IPs)
- Great for portfolio and post-event sharing

---

## 📋 Checklist

- [ ] **Step 1:** Commit code to GitHub
- [ ] **Step 2:** Deploy backend to Render
- [ ] **Step 3:** Update frontend API URLs
- [ ] **Step 4:** Deploy frontend to Vercel
- [ ] **Step 5:** Test both links

---

## STEP 1: Commit Everything to GitHub

Make sure your repository is up to date:

```bash
git add .
git commit -m "feat: ready for cloud deployment"
git push origin main
```

**Important:** Do NOT commit `.env` file (it contains secrets)

---

## STEP 2: Deploy Backend to Render

### **2A. Go to Render and Create Web Service**

1. Open [Render.com](https://render.com)
2. Sign up/login with GitHub account
3. Click **New +** → **Web Service**
4. Select your SecOPS repository

### **2B. Configure Backend**

Fill in these settings:

| Setting            | Value                                              |
| ------------------ | -------------------------------------------------- |
| **Name**           | `secops-backend`                                   |
| **Root Directory** | `backend`                                          |
| **Environment**    | `Python 3`                                         |
| **Build Command**  | `pip install -r requirements.txt`                  |
| **Start Command**  | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

### **2C. Add Environment Variables**

Click **Add Environment Variable** and enter:

| Key              | Value                                 |
| ---------------- | ------------------------------------- |
| `GEMINI_API_KEY` | _(Your actual Google Gemini API key)_ |

**Where to get key:** [ai.google.dev](https://ai.google.dev)

### **2D. Deploy**

Click **Create Web Service** and wait 3-5 minutes.

Once it says **"Live"**, copy your URL:

```
https://secops-backend-xyz.onrender.com
```

**Save this URL - you'll need it next!**

---

## STEP 3: Update Frontend API URLs

Your frontend is currently calling `127.0.0.1:8000`. We need to change it to your Render backend URL.

### **3A. Find & Replace in Frontend**

Open your frontend code and do a global Find/Replace:

**Find:** `127.0.0.1:8000`  
**Replace with:** `secops-backend-xyz.onrender.com` (use YOUR actual Render URL)

### **3B. Check These Files**

- `frontend/src/app/page.tsx` - Main dashboard
- `frontend/src/app/incidents/[id]/page.tsx` - Detail page

Replace all instances of:

```
http://127.0.0.1:8000
```

With:

```
https://secops-backend-xyz.onrender.com
```

### **3C. Commit Changes**

```bash
git add .
git commit -m "fix: update API URLs to production Render backend"
git push origin main
```

---

## STEP 4: Deploy Frontend to Vercel

### **4A. Go to Vercel and Import Project**

1. Open [Vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **Add New...** → **Project**
4. Import your SecOPS repository

### **4B. Configure Frontend**

1. Look for **Root Directory**
2. Click "Edit" and select `frontend` folder
3. **Framework Preset** should auto-detect **Next.js**
4. Click **Deploy**

Vercel will build and deploy in ~60 seconds.

**Your URL will be:**

```
https://secops-dashboard-xyz.vercel.app
```

---

## STEP 5: Test Both Links

### **Test Backend**

Open in browser:

```
https://secops-backend-xyz.onrender.com/incidents
```

Should return JSON with incidents data (200 OK).

### **Test Frontend**

Open in browser:

```
https://secops-dashboard-xyz.vercel.app
```

Should load the dashboard. Click "Simulate Attack" to verify it connects to your Render backend.

---

## 🎯 Final URLs for Judges

**Give judges these two links:**

| Component       | URL                                       |
| --------------- | ----------------------------------------- |
| **Dashboard**   | `https://secops-dashboard-xyz.vercel.app` |
| **Backend API** | `https://secops-backend-xyz.onrender.com` |

---

## ⚠️ Important Notes

### **Honeypot Behavior on Cloud**

- **Locally:** Captures your teammates' actual IP addresses
- **On Cloud:** Captures random internet bots (still works, just different data)
- **For live demo:** Always run locally for perfect honeypot UX

### **Cold Start**

- Render free tier may take 30 seconds to wake up first time
- After first request, it stays warm

### **Data Persistence**

- Render backend stores data in-memory + `db.json`
- Data persists between requests but not across restarts
- Not suitable for production but fine for demo

---

## 🚨 Troubleshooting

| Issue                      | Fix                                                    |
| -------------------------- | ------------------------------------------------------ |
| Backend won't deploy       | Check Build Command: `pip install -r requirements.txt` |
| Frontend shows blank       | Check Root Directory is `frontend`                     |
| API calls fail from Vercel | Make sure CORS is `allow_origins=["*"]` in main.py     |
| Gemini responses missing   | Verify `GEMINI_API_KEY` env var is set on Render       |
| Render backend is slow     | Cold start - wait 30s for first request                |

---

## 🎬 Demo Strategy for Judges

### **Option A: Live Presentation (Recommended)**

```bash
# Run locally for absolute perfect experience
bash START.sh  # or double-click START.bat

# Tell judges about cloud links for portfolio
# But show them local version for demo
```

### **Option B: Cloud-Only Presentation**

- Use Vercel + Render links
- Acknowledge: "Honeypot captures internet bots, not local teammates"
- Still impressive and works perfectly

---

## ✅ Deployment Complete!

Once both are live:

1. ✅ Backend on Render
2. ✅ Frontend on Vercel
3. ✅ Links working
4. ✅ Ready for judges

**Pro tip:** Use the local version for your live presentation (faster, honeypot works perfectly). Use the cloud links in your GitHub README for portfolio.

---

**Ready to deploy? Follow the 4 steps above - should take ~15 minutes! 🚀**
