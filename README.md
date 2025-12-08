# NBA Betting Dashboard - SolidJS Frontend

Frontend application for NBA betting system with live scores, SHAP predictions, and BetInput integration.

## Features

- 🏀 **Live NBA Scores** - Real-time game scores from NBA API (`/nba` folder)
- 📊 **SHAP Predictions** - Integrated SHAP predictions displayed with games
- 🎲 **BetInput Integration** - Place bets with automatic game selection
- 📱 **Game Grid** - Clickable game tiles showing scores and status
- 🔄 **Auto-Refresh** - Live scores update every 30 seconds

## API Endpoints

### NBA API (`/nba` folder)
- `GET /games` - All games (live, scheduled, final)
- `GET /games/live` - Live games only
- `GET /games/pregame` - Scheduled games
- `GET /games/{gameId}` - Specific game details

### SHAP API (`/SHAP` folder)
- `GET /api/predictions/live` - Live predictions

### BetInput API (`/BetInput` folder)
- `GET /api/games/{date}` - Get games for betting
- `POST /api/calculate-bet` - Calculate bet details
- `POST /api/bets` - Create bet
- `GET /api/balance` - Get portfolio balance

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set environment variables** (create `.env` file):
```env
VITE_NBA_API_URL=http://localhost:8000
VITE_SHAP_API_URL=http://localhost:8001
VITE_BETINPUT_API_URL=http://localhost:8002
```

For production (Railway):
```env
VITE_NBA_API_URL=https://your-nba-api.railway.app
VITE_SHAP_API_URL=https://your-shap-api.railway.app
VITE_BETINPUT_API_URL=https://your-betinput-api.railway.app
```

3. **Run development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── clients.ts          # API client functions
│   ├── pages/
│   │   ├── Home.tsx            # Game grid page
│   │   ├── GameDetail.tsx      # Individual game page
│   │   └── BetInput.tsx        # Bet placement page
│   ├── styles/
│   │   ├── Home.css
│   │   ├── GameDetail.css
│   │   └── BetInput.css
│   ├── App.tsx                 # Main app component
│   ├── index.tsx               # Entry point
│   └── index.css               # Global styles
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Navigation Flow

1. **Home Page** (`/`)
   - Shows grid of all games
   - Click game tile → Game Detail page
   - Click "Place Bet" button → BetInput page
   - Click "Place Bet" on tile → BetInput with game pre-selected

2. **Game Detail** (`/game/:gameId`)
   - Shows game details, scores, SHAP predictions
   - Click "Place Bet" → BetInput with game pre-selected

3. **BetInput** (`/bet` or `/bet/:gameId`)
   - If `gameId` in URL → Game auto-selected
   - Enter bet details, calculate, and place bet
   - Automatically saves to Portfolio

## Development

- **Port**: 3000 (default)
- **Hot Reload**: Enabled
- **Proxy**: Configured in `vite.config.ts` for API calls

## Deployment

The frontend can be deployed to:
- **Vercel** (recommended for SolidJS)
- **Netlify**
- **Railway**
- Any static hosting service

Make sure to set environment variables for API URLs in your deployment platform.

