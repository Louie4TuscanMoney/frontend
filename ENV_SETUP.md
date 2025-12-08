# Environment Setup for Railway

## Quick Setup

### 1. Local Development
Create `.env` file in `/frontend`:
```env
VITE_NBA_API_URL=http://localhost:8000
VITE_SHAP_API_URL=http://localhost:5000
VITE_BETINPUT_API_URL=http://localhost:8002
```

### 2. Test with Railway (Local Dev)
Create `.env` file with Railway URLs:
```env
VITE_NBA_API_URL=https://your-nba-api.railway.app
VITE_SHAP_API_URL=https://your-shap-api.railway.app
VITE_BETINPUT_API_URL=https://your-betinput-api.railway.app
```

Then run:
```bash
npm run dev
```

### 3. Railway Production
Add these as environment variables in Railway dashboard:
```
VITE_NBA_API_URL=https://your-nba-api.railway.app
VITE_SHAP_API_URL=https://your-shap-api.railway.app
VITE_BETINPUT_API_URL=https://your-betinput-api.railway.app
```

## Get Your Railway URLs

1. Go to Railway dashboard
2. Select each service
3. Go to "Settings" → "Networking"
4. Copy the public domain URL
5. Use format: `https://your-service.railway.app`

## Verify APIs Work

```bash
# Test NBA API
curl https://your-nba-api.railway.app/games

# Test SHAP API
curl https://your-shap-api.railway.app/api/predictions/live

# Test BetInput API
curl https://your-betinput-api.railway.app/api/health
```

