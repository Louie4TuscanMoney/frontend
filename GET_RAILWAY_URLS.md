# Get Your Railway Service URLs

## ✅ All Services Are Running!

From your logs:
- **BetInput**: ✅ Running (Gunicorn on port 8080)
- **NBA**: ✅ Running (Uvicorn on port 8080)
- **SHAP**: ✅ Running (Gunicorn on port 8080)

## Step 1: Get Public URLs

### For Each Service:

1. **Go to Railway Dashboard:**
   https://railway.com/project/28c1b5b3-fbcf-44f8-b9f7-17d74ea25df1?environmentId=8f3d4717-e177-4f69-b706-9179bd78dc3b

2. **For NBA Service:**
   - Click on the **NBA** service
   - Go to **"Settings"** tab
   - Scroll to **"Networking"** section
   - Look for **"Public Domain"** or click **"Generate Domain"**
   - Copy the URL (e.g., `https://nba-production-xxxx.up.railway.app`)

3. **For SHAP Service:**
   - Click on the **SHAP** service
   - Go to **"Settings"** tab
   - Scroll to **"Networking"** section
   - Look for **"Public Domain"** or click **"Generate Domain"**
   - Copy the URL (e.g., `https://shap-production-xxxx.up.railway.app`)

4. **For BetInput Service:**
   - Click on the **BetInput** service
   - Go to **"Settings"** tab
   - Scroll to **"Networking"** section
   - Look for **"Public Domain"** or click **"Generate Domain"**
   - Copy the URL (e.g., `https://betinput-production-xxxx.up.railway.app`)

## Step 2: Test URLs

Test each URL in your browser or terminal:

```bash
# Test NBA API
curl https://your-nba-url.railway.app/games

# Test SHAP API
curl https://your-shap-url.railway.app/api/predictions/live

# Test BetInput API
curl https://your-betinput-url.railway.app/api/health
```

**Expected:**
- NBA: JSON with games array
- SHAP: JSON with predictions (may be empty array)
- BetInput: `{"status": "healthy", ...}`

## Step 3: Configure Frontend

Create `.env` file in `/Users/embrace/Desktop/frontend/`:

```env
VITE_NBA_API_URL=https://your-nba-url.railway.app
VITE_SHAP_API_URL=https://your-shap-url.railway.app
VITE_BETINPUT_API_URL=https://your-betinput-url.railway.app
```

**Replace with your actual URLs from Step 1!**

## Step 4: Test Frontend

```bash
cd /Users/embrace/Desktop/frontend
npm run dev
```

Open browser console (F12) - should see:
```
🌐 Frontend API Configuration:
   NBA API: https://your-nba-url.railway.app
   SHAP API: https://your-shap-url.railway.app
   BetInput API: https://your-betinput-url.railway.app
```

## Alternative: Find URLs in Railway

If you can't find "Networking" settings:

1. Click on each service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. Look for **"Public URL"** or **"Domain"**
5. Or check the **"Metrics"** tab for the URL

## Quick Test Script

After creating `.env`, run:
```bash
cd /Users/embrace/Desktop/frontend
./test-railway-apis.sh
```

This will test all three APIs automatically.

