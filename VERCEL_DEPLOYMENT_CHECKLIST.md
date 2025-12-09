# Vercel Deployment Checklist ✅

## Pre-Deployment Checklist

### ✅ Code Pushed to GitHub
- [x] Frontend changes committed and pushed
- [x] MCSResults page added
- [x] API clients added (data1Api, mcs1Api)
- [x] Navigation updated

### ⚠️ Environment Variables (REQUIRED)

**Must be set in Vercel Dashboard:**

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Add these variables:

```
VITE_DATA_API_URL=https://data1-production.up.railway.app
VITE_MCS_API_URL=https://mcs1-production.up.railway.app
```

3. Set for **Production** environment (and Preview if needed)
4. **Redeploy** after adding variables

## Verify Deployment

### 1. Check Vercel Deployment
- Go to Vercel Dashboard → **Deployments** tab
- Latest deployment should be successful (green checkmark)
- If failed, check build logs

### 2. Test Frontend Pages

**Home Page (`/`):**
- Should load NBA games
- No console errors

**MCS Page (`/mcs`):**
- Should load without errors
- Date selector works
- "Run Master.py" button visible
- Predictions display (if data exists)

### 3. Test API Connections

Open browser console (F12) and check:

**No CORS Errors:**
- ✅ No "Access-Control-Allow-Origin" errors
- ✅ No "Failed to fetch" errors from CORS

**API Calls Work:**
- ✅ `GET /api/daily/DailyMCS/{date}` - Should return data or 404 (not CORS error)
- ✅ `GET /api/run/status` - Should return `{running: false}`
- ✅ `POST /api/run` - Should trigger Master.py

### 4. Test Manual Run Button

1. Click "🚀 Run Master.py" button
2. Should show "Starting Master.py..."
3. Button should disable (show "⏳ Running...")
4. Status should update
5. No CORS errors in console

### 5. Test Predictions Display

1. Select a date with predictions (e.g., 2025-12-08)
2. Should show game cards
3. Each card should show:
   - Team names
   - Filename with spread (e.g., `filename.json (2.5-2.5)`)
   - Win probabilities
   - Spread analysis

## Troubleshooting

### CORS Errors Still Appearing

**Check:**
1. Railway services are deployed with latest CORS fixes
2. Services are running (check Railway logs)
3. API URLs are correct in Vercel environment variables

**Fix:**
- Redeploy Railway services: `railway up` in both mcs1 and data1
- Verify CORS is configured: `CORS(app, resources={r"/api/*": {"origins": "*"}})`

### 404 Errors

**Check:**
1. API URLs are correct
2. Services are running on Railway
3. Endpoints exist (e.g., `/api/run/status`)

**Fix:**
- Verify Railway services are running
- Check Railway logs for errors
- Test API endpoints directly: `curl https://data1-production.up.railway.app/health`

### Predictions Not Loading

**Check:**
1. Date has predictions (check data1 API directly)
2. API URL is correct
3. CORS is working (no CORS errors)

**Fix:**
- Test API directly: `curl https://data1-production.up.railway.app/api/daily/DailyMCS/2025-12-08`
- Check Railway logs for data1 service
- Verify volume is mounted and data exists

## Quick Test Commands

### Test data1 API
```bash
curl https://data1-production.up.railway.app/health
curl https://data1-production.up.railway.app/api/daily/DailyMCS/2025-12-08
```

### Test mcs1 API
```bash
curl https://mcs1-production.up.railway.app/api/health
curl https://mcs1-production.up.railway.app/api/run/status
```

### Test from Frontend Console
```javascript
// Test data1 API
fetch('https://data1-production.up.railway.app/api/daily/DailyMCS/2025-12-08')
  .then(r => r.json())
  .then(console.log)

// Test mcs1 API
fetch('https://mcs1-production.up.railway.app/api/run/status')
  .then(r => r.json())
  .then(console.log)
```

## Success Criteria

✅ **Frontend loads** without errors  
✅ **No CORS errors** in console  
✅ **MCS page** loads predictions  
✅ **Run button** triggers Master.py  
✅ **Status updates** correctly  
✅ **Game cards** display with filenames and spreads  

## If Still Having Issues

1. Check Vercel deployment logs
2. Check Railway logs for both services
3. Verify environment variables are set
4. Test APIs directly with curl
5. Check browser console for specific errors

Everything should work after setting environment variables and redeploying! 🚀

