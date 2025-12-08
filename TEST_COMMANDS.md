# Test Commands

## Check What's Running

### Check if APIs are running:
```bash
# NBA API (should return game data)
curl http://localhost:8000/games

# BetInput API (should return health status)
curl http://localhost:8002/api/health

# Check what's on port 3000 and 3001
lsof -i :3000
lsof -i :3001
```

## Start APIs (if not running)

**Terminal 1 - NBA API:**
```bash
cd /Users/embrace/Desktop/nba && python3 score.py
```
Wait for: "Uvicorn running on http://0.0.0.0:8000"

**Terminal 2 - BetInput API:**
```bash
cd /Users/embrace/Desktop/BetInput && PORT=8002 python3 api_server.py
```
Wait for: "Starting Betting Input API Server on port 8002"

## Start Frontend

```bash
cd /Users/embrace/Desktop/frontend && npm run dev
```

Should show:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Troubleshooting White Screen

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Look for errors** in Console tab
3. **Check Network tab** for failed requests
4. **Verify port** - Frontend should be on 3000 (check terminal output)

## Common Errors

**"Failed to fetch"** = APIs not running
**CORS errors** = API CORS not configured
**"Cannot read property..."** = JavaScript error in code

