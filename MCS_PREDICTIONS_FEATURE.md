# MCS Predictions Feature - Complete ✅

## What Was Added

### 1. New Page: MCS Predictions (`/mcs`)
- Displays @DailyMCS predictions for any date
- Shows today's predictions by default
- Date selector to view past predictions
- Manual "Run Master.py" button
- Real-time status updates

### 2. API Clients Added

**data1Api** - Access @DailyMCS data:
- `getDailyMCS(date)` - Get all predictions for a date
- `getDailyOdds(date)` - Get odds data
- `getDailyResults(date)` - Get results data
- `getGamePrediction(date, filename)` - Get specific game

**mcs1Api** - Control Master.py:
- `triggerMasterPy()` - Manually run Master.py
- `getRunStatus()` - Check if Master.py is running
- `getPredictions(date)` - Get predictions via mcs1 API

### 3. Features

✅ **Date Selection** - View predictions for any date  
✅ **Manual Run Button** - Trigger Master.py execution  
✅ **Status Display** - Shows if Master.py is running  
✅ **Game Cards** - Beautiful display of each game's predictions  
✅ **Win Probabilities** - Shows home/away team win probabilities  
✅ **Spread Analysis** - Displays spread odds comparison  
✅ **Full Data View** - Expandable JSON view for each game  
✅ **Auto-refresh** - Refreshes predictions after Master.py completes  

## Environment Variables for Vercel

Add these to your Vercel project settings:

```bash
VITE_DATA_API_URL=https://data1-production.up.railway.app
VITE_MCS_API_URL=https://mcs1-production.up.railway.app
```

**How to add in Vercel:**
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add:
   - `VITE_DATA_API_URL` = `https://data1-production.up.railway.app`
   - `VITE_MCS_API_URL` = `https://mcs1-production.up.railway.app`
4. Redeploy

## Usage

### Access the Page
Navigate to: `https://your-frontend.vercel.app/mcs`

### Run Master.py
1. Click "🚀 Run Master.py" button
2. Status will show "Running..."
3. Predictions will auto-refresh after ~30 seconds

### View Predictions
- Default shows today's date
- Use date picker to view past dates
- Each card shows:
  - Teams playing
  - Win probabilities
  - Spread analysis
  - Full prediction data (expandable)

## API Endpoints Used

### data1 API
- `GET /api/daily/DailyMCS/{date}` - Get all predictions
- `GET /api/daily/DailyMCS/{date}/{filename}` - Get specific game

### mcs1 API
- `POST /api/run` - Trigger Master.py
- `GET /api/run/status` - Check running status

## Files Created/Modified

### Created:
- `src/pages/MCSResults.tsx` - Main component
- `src/styles/MCSResults.css` - Styling

### Modified:
- `src/api/clients.ts` - Added data1Api and mcs1Api
- `src/App.tsx` - Added route and navigation link

## Testing

1. **Local Testing:**
   ```bash
   # Make sure APIs are running locally or update .env
   npm run dev
   # Navigate to http://localhost:5173/mcs
   ```

2. **Production Testing:**
   - Deploy to Vercel
   - Set environment variables
   - Navigate to `/mcs` page
   - Test "Run Master.py" button
   - Verify predictions display

## Troubleshooting

### "Failed to load predictions"
- Check `VITE_DATA_API_URL` is set correctly
- Verify data1 API is deployed and accessible
- Check Railway logs for data1 service

### "Failed to trigger Master.py"
- Check `VITE_MCS_API_URL` is set correctly
- Verify mcs1 API is deployed and accessible
- Check Railway logs for mcs1 service

### No predictions shown
- Make sure Master.py has run for that date
- Check date format (YYYY-MM-DD)
- Verify data exists in B2 storage

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Set environment variables
3. ✅ Test the feature
4. ✅ Verify Master.py can be triggered
5. ✅ Confirm predictions display correctly

Everything is ready! 🚀

