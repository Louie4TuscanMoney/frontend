# Quick Railway Setup Guide

## Your Railway Project
**URL:** https://railway.com/project/28c1b5b3-fbcf-44f8-b9f7-17d74ea25df1?environmentId=8f3d4717-e177-4f69-b706-9179bd78dc3b

## Quick Checklist

### ✅ Step 1: Verify Services (2 minutes)
1. Open Railway dashboard link above
2. You should see 3 services:
   - **NBA** (or similar name)
   - **SHAP** (or similar name)
   - **BetInput** (or similar name)
3. Each should show "Running" status

### ✅ Step 2: Get URLs (3 minutes)
For EACH service:
1. Click on the service
2. Go to "Settings" → "Networking"
3. Click "Generate Domain" if no domain exists
4. Copy the domain URL (e.g., `https://nba-production.railway.app`)

**Write them down:**
- NBA URL: `https://______________.railway.app`
- SHAP URL: `https://______________.railway.app`
- BetInput URL: `https://______________.railway.app`

### ✅ Step 3: Test APIs (1 minute)
Run this command (replace with your URLs):
```bash
# Test NBA
curl https://your-nba-url.railway.app/games

# Test SHAP
curl https://your-shap-url.railway.app/api/predictions/live

# Test BetInput
curl https://your-betinput-url.railway.app/api/health
```

All should return JSON data (not errors).

### ✅ Step 4: Configure Frontend (1 minute)
Create `.env` file in `/frontend` folder:
```env
VITE_NBA_API_URL=https://your-nba-url.railway.app
VITE_SHAP_API_URL=https://your-shap-url.railway.app
VITE_BETINPUT_API_URL=https://your-betinput-url.railway.app
```

**Replace with your actual URLs from Step 2!**

### ✅ Step 5: Test Frontend (1 minute)
```bash
cd /Users/embrace/Desktop/frontend
npm run dev
```

Open browser → Console (F12) → Should see:
- API URLs logged
- No CORS errors
- Games loading

## Or Use the Test Script

```bash
cd /Users/embrace/Desktop/frontend
./test-railway-apis.sh
```

This will automatically test all your Railway APIs if `.env` is configured.

## Troubleshooting

### "Services not showing in Railway"
- Make sure you're in the right project/environment
- Check if services are paused or stopped
- Verify GitHub repos are connected

### "Can't find Networking settings"
- Railway automatically generates domains
- Check service "Deployments" tab for the URL
- Look for "Public URL" in service overview

### "CORS errors in browser"
- All services should have CORS enabled (already configured)
- Check Railway logs if errors persist
- Verify frontend URL matches allowed origins

### "No data loading"
- Test APIs directly with curl (Step 3)
- Check browser Network tab for failed requests
- Verify `.env` file has correct URLs

## Need Help?

1. Check Railway logs for each service
2. Test APIs directly with curl
3. Check browser console for errors
4. Verify `.env` file is correct

