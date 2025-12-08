# Debugging White Screen

## Quick Checks

### 1. Check Browser Console
Open browser DevTools (F12) and check Console tab for errors.

### 2. Verify Frontend is Running
The frontend should run on **port 3000**, not 3001.
- Check terminal where you ran `npm run dev`
- Should show: `Local: http://localhost:3000`

### 3. Test APIs Manually

**NBA API:**
```bash
curl http://localhost:8000/games
```

**BetInput API:**
```bash
curl http://localhost:8002/api/health
```

### 4. Common Issues

**White Screen = JavaScript Error**
- Open browser console (F12 → Console)
- Look for red error messages
- Common causes:
  - API connection errors (CORS)
  - Missing dependencies
  - TypeScript/build errors

**APIs Not Running:**
- Start NBA API: `cd /Users/embrace/Desktop/nba && python3 score.py`
- Start BetInput API: `cd /Users/embrace/Desktop/BetInput && PORT=8002 python3 api_server.py`

**Wrong Port:**
- Frontend runs on port 3000 (check vite.config.ts)
- If Vite says "port 3000 in use", it will use 3001
- Check terminal output for actual port

### 5. Check Network Tab
- Open DevTools → Network tab
- Reload page
- Look for failed API requests (red status codes)

