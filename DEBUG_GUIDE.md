# Frontend Debugging Guide

## ✅ Fixed Issues

### Router Error - FIXED
- Removed `Outlet` import (doesn't exist in v0.10)
- Using `root` prop with inline function
- Router now correctly wraps all components

### API Configuration - VERIFIED
- NBA API: ✅ Returns 3 games
- SHAP API: ✅ Connected
- BetInput API: ✅ Connected

## Debugging Steps

### 1. Check Browser Console (F12)
Look for:
- `🌐 Frontend API Configuration:` - Should show all 3 API URLs
- Any CORS errors
- API response errors
- Network tab for failed requests

### 2. Verify API Calls
Open Network tab (F12 → Network):
- Look for requests to `/games` endpoint
- Check status codes (should be 200)
- Check response data

### 3. Check Data Loading
In console, type:
```javascript
// Check if games are loading
fetch('https://web-production-8ddddc.up.railway.app/games')
  .then(r => r.json())
  .then(d => console.log('Games:', d.games.length))
```

### 4. Verify Component State
The Home component should:
- Call `loadData()` on mount
- Set games state with `setGames()`
- Display games in the grid

## Common Issues

### No Games Showing
1. Check browser console for errors
2. Verify NBA API URL in `.env`
3. Test API directly: `curl https://web-production-8ddddc.up.railway.app/games`
4. Check Network tab for failed requests

### CORS Errors
- All APIs have CORS enabled
- Check Railway logs if errors persist

### Router Errors
- Should be fixed now
- Hard refresh browser (Cmd+Shift+R)

## Expected Behavior

### On Page Load:
1. Shows "Loading games..." briefly
2. Fetches from NBA API
3. Fetches from SHAP API (may return empty)
4. Displays game tiles with scores
5. Shows SHAP badge if predictions available

### Game Tiles Should Show:
- Team names
- Scores
- Game status (Live/Scheduled/Final)
- "Place Bet" button
- SHAP badge (if available)

