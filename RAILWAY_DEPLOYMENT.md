# Railway Deployment Guide for Frontend

## Overview
This frontend connects to multiple backend APIs deployed on Railway:
- **NBA API** - Live scores and game data
- **SHAP API** - ML predictions
- **BetInput API** - Betting functionality

## Setting Up Railway URLs

### 1. Get Your Railway URLs
After deploying each service to Railway, get the public URLs:
1. Go to Railway dashboard
2. Select each service (NBA, SHAP, BetInput)
3. Copy the public URL (e.g., `https://nba-api.railway.app`)

### 2. Configure Environment Variables

#### For Local Development:
Create `.env` file in `/frontend` folder:
```env
VITE_NBA_API_URL=http://localhost:8000
VITE_SHAP_API_URL=http://localhost:5000
VITE_BETINPUT_API_URL=http://localhost:8002
```

#### For Railway Production:
In Railway frontend service, add environment variables:
```env
VITE_NBA_API_URL=https://your-nba-api.railway.app
VITE_SHAP_API_URL=https://your-shap-api.railway.app
VITE_BETINPUT_API_URL=https://your-betinput-api.railway.app
```

## Backend CORS Configuration

All backend APIs must allow CORS from your frontend domain.

### NBA API (`/nba/score.py`)
✅ Already configured:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### BetInput API (`/BetInput/api_server.py`)
✅ Already configured:
```python
from flask_cors import CORS
CORS(app)  # Enable CORS for all routes
```

### SHAP API (`/SHAP/api_server.py`)
✅ Should already have CORS configured - verify it includes:
```python
from flask_cors import CORS
CORS(app)
```

## Testing with Railway Backends

### Option 1: Test Locally with Railway URLs
1. Create `.env` file with Railway URLs
2. Run `npm run dev`
3. Frontend will connect to Railway backends

### Option 2: Deploy Frontend to Railway
1. Connect frontend repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy
4. Frontend will automatically use Railway URLs

## Railway Frontend Deployment

### 1. Create Railway Project
```bash
# In Railway dashboard
1. New Project
2. Deploy from GitHub
3. Select your frontend repository
```

### 2. Configure Build Settings
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run preview` (or serve static files)
- **Output Directory**: `dist`

### 3. Add Environment Variables
Add these in Railway dashboard:
```
VITE_NBA_API_URL=https://your-nba-api.railway.app
VITE_SHAP_API_URL=https://your-shap-api.railway.app
VITE_BETINPUT_API_URL=https://your-betinput-api.railway.app
```

### 4. Deploy
Railway will:
1. Install dependencies
2. Build the app (creates `dist` folder)
3. Serve the static files

## Verification

### Test API Connections
Open browser console (F12) and check:
- API URLs logged on page load
- No CORS errors
- Data loading successfully

### Test Each API:
```bash
# NBA API
curl https://your-nba-api.railway.app/games

# SHAP API  
curl https://your-shap-api.railway.app/api/predictions/live

# BetInput API
curl https://your-betinput-api.railway.app/api/health
```

## Troubleshooting

### CORS Errors
- Check backend APIs have CORS enabled
- Verify `allow_origins` includes your frontend domain

### API Connection Errors
- Verify Railway URLs are correct
- Check environment variables are set
- Test APIs directly with curl

### White Screen
- Check browser console for errors
- Verify all environment variables are set
- Check Railway logs for build errors

## Production Optimizations

The frontend automatically:
- ✅ Handles API errors gracefully
- ✅ Shows loading states
- ✅ Works offline (cached data)
- ✅ Auto-refreshes game data
- ✅ Handles missing data gracefully

