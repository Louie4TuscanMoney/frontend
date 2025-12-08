# Vercel + Railway Architecture

## 🏗️ Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│  Frontend       │  HTTP   │  BetInput API    │
│  (Vercel)       │ ───────> │  (Railway)       │
│                 │          │                  │
│  - Static files │          │  - Saves data    │
│  - No storage   │          │  - Portfolio JSON│
└─────────────────┘          │  - Bet history   │
                              └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  Railway Volume   │
                              │  (Persistent)     │
                              │                   │
                              │  portfolio.json   │
                              │  bet_history.json │
                              └──────────────────┘
```

## ✅ Yes, Everything Saves!

**Frontend (Vercel)**:
- Only serves static files (HTML, CSS, JS)
- Makes API calls to Railway
- **No data storage** - just UI

**Backend (Railway)**:
- Handles all API requests
- **Saves all data** to JSON files
- Stores in Railway Volume (persistent)

## 🔧 Setup Steps

### 1. Frontend on Vercel

1. Connect GitHub repo (`frontend` folder)
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variables:
   ```
   VITE_NBA_API_URL=https://web-production-8ddddc.up.railway.app
   VITE_SHAP_API_URL=https://liveshap1-production.up.railway.app
   VITE_BETINPUT_API_URL=https://betinput-production.up.railway.app
   ```

### 2. Backend on Railway

1. **Add Volume** (IMPORTANT!):
   - Railway Dashboard → BetInput Service
   - Volumes → New Volume
   - Name: `portfolio-data`
   - Mount: `/app/portfolio`

2. **Set Environment Variable**:
   ```
   PORTFOLIO_DIR=/app/portfolio
   ```

3. **Deploy**: Railway auto-deploys from GitHub

## 📊 Data Persistence

### ✅ With Railway Volume:
- All bets saved ✅
- Portfolio balance saved ✅
- Bet history saved ✅
- **Survives redeploys** ✅
- **Survives restarts** ✅

### ❌ Without Volume:
- Data saves during runtime ✅
- **Lost on redeploy** ❌
- **Lost on restart** ❌

## 🎯 Summary

**Question**: Will everything save if frontend is on Vercel and APIs are on Railway?

**Answer**: 
- ✅ **Yes, if you add a Railway Volume!**
- ✅ Frontend makes API calls → Railway saves data
- ✅ Data persists in Railway Volume
- ⚠️ **Without volume, data can be lost on redeploy**

## 🚀 Next Steps

1. **Add Railway Volume** (if not done)
2. **Set PORTFOLIO_DIR** environment variable
3. **Deploy frontend to Vercel**
4. **Test**: Place a bet → Check Railway volume → Verify data persists

Everything will work perfectly! 🎉

