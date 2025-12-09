# Frontend MCS Page Setup ✅

## API URLs Updated

The frontend has been updated with the correct Railway API URLs:

- **Data1 API**: `https://data1-api-production.up.railway.app`
- **MCS1 API**: `https://ml1mcs-production.up.railway.app`

## Environment Variables for Vercel

Set these in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

### Production Environment:
```
VITE_DATA_API_URL=https://data1-api-production.up.railway.app
VITE_MCS_API_URL=https://ml1mcs-production.up.railway.app
```

### Preview Environment (optional):
```
VITE_DATA_API_URL=https://data1-api-production.up.railway.app
VITE_MCS_API_URL=https://ml1mcs-production.up.railway.app
```

## Features

### MCS Results Page (`/mcs`)

1. **Date Selector**: Choose any date to view predictions
2. **Run Master.py Button**: Manually trigger Master.py execution
3. **Run Status**: Shows if Master.py is currently running
4. **Predictions Display**: 
   - Groups predictions by game_id
   - Shows only the most recent prediction for each game
   - Displays win probabilities, spreads, and full data

### API Endpoints Used

**Data1 API:**
- `GET /api/daily/DailyMCS/{date}` - Get all MCS predictions for a date

**MCS1 API:**
- `POST /api/run` - Trigger Master.py manually
- `GET /api/run/status` - Check if Master.py is running

## Testing

After deploying to Vercel:

1. Navigate to `/mcs` page
2. Select today's date (or a date with predictions)
3. Click "Run Master.py" to generate new predictions
4. View predictions displayed in cards

## CORS

Both APIs have CORS configured to allow requests from Vercel frontend:
- ✅ All origins allowed (`*`)
- ✅ Credentials supported
- ✅ Preflight OPTIONS requests handled

## Troubleshooting

### No predictions showing?
- Check if Master.py has run for that date
- Click "Run Master.py" to generate predictions
- Check browser console for API errors

### CORS errors?
- Verify environment variables are set in Vercel
- Check that Railway services are running
- Verify CORS headers in browser Network tab

### API not responding?
- Check Railway dashboard for service status
- Verify service URLs are correct
- Check Railway logs for errors

## Next Steps

1. **Deploy to Vercel** with updated environment variables
2. **Test the `/mcs` page** 
3. **Run Master.py** to generate predictions
4. **Verify predictions display** correctly

Everything is ready! 🚀

