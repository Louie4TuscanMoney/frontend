# Railway Services Configuration

## Your Railway Project
Project: `28c1b5b3-fbcf-44f8-b9f7-17d74ea25df1`
Environment: `8f3d4717-e177-4f69-b706-9179bd78dc3b`

## Services Expected
1. **NBA API** - Live scores and game data
2. **SHAP API** - ML predictions
3. **BetInput API** - Betting functionality

## Step 1: Verify Services are Running

### In Railway Dashboard:
1. Go to: https://railway.com/project/28c1b5b3-fbcf-44f8-b9f7-17d74ea25df1?environmentId=8f3d4717-e177-4f69-b706-9179bd78dc3b
2. Check each service:
   - **NBA Service** - Should show "Running" status
   - **SHAP Service** - Should show "Running" status
   - **BetInput Service** - Should show "Running" status

### Check Service Logs:
Click on each service → "Logs" tab
- Should see startup messages
- No critical errors
- API server started messages

## Step 2: Get Service URLs

For each service in Railway:
1. Click on the service
2. Go to "Settings" → "Networking"
3. Find "Public Domain" or "Generate Domain"
4. Copy the URL (format: `https://service-name.railway.app`)

**Expected URLs:**
- NBA: `https://nba-production.railway.app` or similar
- SHAP: `https://shap-production.railway.app` or similar
- BetInput: `https://betinput-production.railway.app` or similar

## Step 3: Test APIs Directly

Test each API from terminal:

```bash
# Test NBA API
curl https://your-nba-url.railway.app/games

# Test SHAP API
curl https://your-shap-url.railway.app/api/predictions/live

# Test BetInput API
curl https://your-betinput-url.railway.app/api/health
```

**Expected Responses:**
- NBA: JSON with games array
- SHAP: JSON with predictions array
- BetInput: `{"status": "healthy", ...}`

## Step 4: Configure Frontend

### Create `.env` file in `/frontend`:

```env
VITE_NBA_API_URL=https://your-nba-url.railway.app
VITE_SHAP_API_URL=https://your-shap-url.railway.app
VITE_BETINPUT_API_URL=https://your-betinput-url.railway.app
```

**Replace with your actual Railway URLs from Step 2.**

## Step 5: Verify CORS is Enabled

All services must allow CORS. Check each service:

### NBA API (`/nba/score.py`)
Should have:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### SHAP API (`/SHAP/api_server.py`)
Should have:
```python
from flask_cors import CORS
CORS(app)
```

### BetInput API (`/BetInput/api_server.py`)
Should have:
```python
from flask_cors import CORS
CORS(app)
```

## Step 6: Test Frontend Connection

1. Update `.env` with Railway URLs
2. Run frontend:
   ```bash
   cd /Users/embrace/Desktop/frontend
   npm run dev
   ```
3. Open browser console (F12)
4. Should see:
   ```
   API URLs: {
     NBA_API_URL: "https://...",
     SHAP_API_URL: "https://...",
     BETINPUT_API_URL: "https://..."
   }
   ```
5. Check for errors:
   - No CORS errors ✅
   - No connection refused ✅
   - Data loading ✅

## Troubleshooting

### Services Not Running
- Check Railway logs for errors
- Verify environment variables are set
- Check if services have crashed

### CORS Errors in Browser
- Verify CORS middleware is enabled
- Check service logs for CORS errors
- Ensure frontend URL is allowed

### Connection Refused
- Verify service URLs are correct
- Check services are actually running
- Verify Railway networking is enabled

### No Data Loading
- Test APIs directly with curl
- Check browser Network tab for failed requests
- Verify API endpoints match frontend expectations

