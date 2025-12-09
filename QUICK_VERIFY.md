# Quick Verification Guide

## Is Vercel Deployment Working?

### Step 1: Check Environment Variables

Go to Vercel Dashboard → Settings → Environment Variables

**Required:**
- ✅ `VITE_DATA_API_URL` = `https://data1-production.up.railway.app`
- ✅ `VITE_MCS_API_URL` = `https://mcs1-production.up.railway.app`

If missing → Add them → Redeploy

### Step 2: Test Frontend

1. Open your Vercel frontend URL
2. Navigate to `/mcs` page
3. Open browser console (F12)

**Should see:**
- ✅ No CORS errors
- ✅ Predictions load (or "No predictions" message)
- ✅ "Run Master.py" button works

**Should NOT see:**
- ❌ CORS errors
- ❌ "Failed to fetch" errors
- ❌ 404 errors (unless no data for that date)

### Step 3: Quick Test

In browser console, run:
```javascript
// Test data1 API
fetch('https://data1-production.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
// Should return: {"status": "ok"}

// Test mcs1 API  
fetch('https://mcs1-production.up.railway.app/api/run/status')
  .then(r => r.json())
  .then(console.log)
// Should return: {"running": false, "timestamp": "..."}
```

If these work → APIs are accessible  
If CORS errors → Railway services need CORS fix redeployed  
If 404 → Check Railway services are running

## Common Issues

### CORS Errors
→ Railway services need latest CORS fixes deployed

### 404 Errors
→ Check Railway services are running

### No Predictions
→ Check date has data, or run Master.py

### Environment Variables Not Working
→ Make sure they're set for Production environment
→ Redeploy after adding variables

