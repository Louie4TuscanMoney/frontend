# Quick Start Guide

## Setup and Run Development Server

### Quick Start (Copy & Paste All)

```bash
cd /Users/embrace/Desktop/frontend && npm install && npm run dev
```

The site will be available at: **http://localhost:3000**

---

### Step by Step

**Step 1: Navigate to frontend folder**
```bash
cd /Users/embrace/Desktop/frontend
```

**Step 2: Install dependencies** (first time only)
```bash
npm install
```

**Step 3: Run development server**
```bash
npm run dev
```

**Step 4: Open browser**
Visit: **http://localhost:3000**

---

## Before Running - Make Sure APIs Are Running

**Important:** Start these APIs in separate terminals before running the frontend!

### Terminal 1: NBA API (Port 8000)
```bash
cd /Users/embrace/Desktop/nba && python3 score.py
```
Verify: `curl http://localhost:8000/games`

### Terminal 2: SHAP API (Port 5000) - Optional
```bash
cd /Users/embrace/Desktop/SHAP && python3 api_server.py
```
Verify: `curl http://localhost:5000/api/status`

### Terminal 3: BetInput API (Port 8002)
**Note:** BetInput and NBA both default to port 8000. Run BetInput on a different port:
```bash
cd /Users/embrace/Desktop/BetInput && PORT=8002 python3 api_server.py
```

Verify: `curl http://localhost:8002/api/health`

### Quick Start Script (Alternative)
Or use the helper script to start APIs:
```bash
cd /Users/embrace/Desktop/frontend && ./START_APIS.sh
```

### Terminal 4: Frontend Dev Server (Port 3000)
```bash
cd /Users/embrace/Desktop/frontend && npm run dev
```

---

## Testing the Site

Once the dev server is running:

1. **Open browser to:** http://localhost:3000
2. **You should see:**
   - Game grid with NBA games (if NBA API is running)
   - "Place Bet" button in navigation
   - Clickable game tiles showing scores
   - Live indicator for active games

3. **Test Features:**
   - Click a game tile → Opens game detail page
   - Click "Place Bet" on a tile → Opens BetInput with game pre-selected
   - Click "Place Bet" in nav → Opens BetInput page
   - Game detail page shows SHAP predictions (if available)

---

## Troubleshooting

**No games showing?**
- Check NBA API: `curl http://localhost:8000/games`
- Check browser console (F12) for errors
- Verify NBA API is running

**API connection errors?**
- Verify API URLs in `.env` match your API ports
- Check CORS settings on your APIs (should allow all origins for dev)
- Test APIs directly:
  ```bash
  curl http://localhost:8000/games          # NBA
  curl http://localhost:5000/api/status     # SHAP  
  curl http://localhost:8002/api/health     # BetInput
  ```

**Port conflicts?**
- NBA API: Port 8000
- SHAP API: Port 5000
- BetInput API: Use port 8002 (update `.env` if different)

