// API Configuration - Works with both local and Railway
// Set these in .env file for Railway deployment:
// VITE_NBA_API_URL=https://your-nba-api.railway.app
// VITE_SHAP_API_URL=https://your-shap-api.railway.app
// VITE_BETINPUT_API_URL=https://your-betinput-api.railway.app

// Ensure URL has https:// protocol
const getNBAUrl = () => {
  const url = import.meta.env.VITE_NBA_API_URL || 
    (import.meta.env.DEV ? 'http://localhost:8000' : 'https://web-production-8ddddc.up.railway.app');
  // Add https:// if missing
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};
const NBA_API_URL = getNBAUrl();
  
const SHAP_API_URL = import.meta.env.VITE_SHAP_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://shap-api.railway.app');
  
const BETINPUT_API_URL = import.meta.env.VITE_BETINPUT_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:8002' : 'https://betinput-api.railway.app');

// Log API URLs (always log for debugging)
console.log('🌐 Frontend API Configuration:');
console.log('   NBA API:', NBA_API_URL);
console.log('   SHAP API:', SHAP_API_URL);
console.log('   BetInput API:', BETINPUT_API_URL);
console.log('   VITE_NBA_API_URL env:', import.meta.env.VITE_NBA_API_URL);
console.log('');

// Types
// NBA API format (from /nba folder - FastAPI service)
export interface NBAGame {
  gameId: string | number;
  homeTeam: {
    teamId: number;
    teamName: string;
    score: number;
  };
  awayTeam: {
    teamId: number;
    teamName: string;
    score: number;
  };
  gameStatusText: string;
  gameClock?: string;
  formattedClock?: string;
  period?: number;
  possessionTeamId?: number;
  hasPossession?: {
    home: boolean;
    away: boolean;
  };
}

export interface SHAPPrediction {
  game_id?: string;
  gameId?: string;
  prediction: any;
  shap_values?: any;
}

export interface BetData {
  game_id: string;
  home_team: string;
  away_team: string;
  home_team_id: string;
  away_team_id: string;
  team_selected: string;
  bet_type: string;
  spread?: number;
  american_odds: number;
  risk_percent: number;
}

// NBA API Client (from /nba folder - FastAPI service)
// Endpoints: GET /games, GET /games/live, GET /games/pregame, GET /games/{game_id}
export const nbaApi = {
  async getAllGames(): Promise<NBAGame[]> {
    try {
      const url = `${NBA_API_URL}/games`;
      console.log('Fetching games from:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`NBA API error: ${response.status} ${response.statusText}`, errorText);
        return [];
      }
      
      const data = await response.json();
      console.log('NBA API response:', data);
      
      // Handle both formats: {games: [...]} and direct array
      if (Array.isArray(data)) {
        return data;
      }
      return data.games || data.all_games || [];
    } catch (error) {
      console.error('NBA API connection error:', error);
      console.error(`NBA API URL: ${NBA_API_URL}/games`);
      console.error('Error details:', error);
      return [];
    }
  },

  async getLiveGames(): Promise<NBAGame[]> {
    try {
      const response = await fetch(`${NBA_API_URL}/games/live`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.games || [];
    } catch (error) {
      console.error('NBA API error:', error);
      return [];
    }
  },

  async getPregameGames(): Promise<NBAGame[]> {
    try {
      const response = await fetch(`${NBA_API_URL}/games/pregame`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.games || [];
    } catch (error) {
      console.error('NBA API error:', error);
      return [];
    }
  },

  async getGameById(gameId: string): Promise<NBAGame | null> {
    try {
      const response = await fetch(`${NBA_API_URL}/games/${gameId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('NBA API error:', error);
      return null;
    }
  }
};

// SHAP API Client with error handling
export const shapApi = {
  async getPredictions(): Promise<SHAPPrediction[]> {
    try {
      // SHAP API uses /api/predictions endpoint (not /api/predictions/live)
      const response = await fetch(`${SHAP_API_URL}/api/predictions`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!response.ok) {
        console.warn(`SHAP API returned ${response.status}: ${response.statusText}`);
        return [];
      }
      const data = await response.json();
      // SHAP API returns { predictions: [], total: 0 } format
      return data.predictions || [];
    } catch (error) {
      console.error('SHAP API connection error:', error);
      console.error(`SHAP API URL: ${SHAP_API_URL}/api/predictions`);
      return [];
    }
  },

  async getPredictionForGame(gameId: string): Promise<SHAPPrediction | null> {
    try {
      const predictions = await this.getPredictions();
      return predictions.find(p => 
        String(p.game_id) === String(gameId) || 
        String(p.gameId) === String(gameId)
      ) || null;
    } catch (error) {
      console.error('SHAP API error (getPredictionForGame):', error);
      return null;
    }
  }
};

// BetInput API Client with error handling
export const betInputApi = {
  async getBalance() {
    try {
      const response = await fetch(`${BETINPUT_API_URL}/api/balance`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('BetInput API error (getBalance):', error);
      return { balance: 150.0, formatted: '$150.00', risk_percent: 7.33, error: true };
    }
  },

  async getGames(date: string = 'today') {
    try {
      const response = await fetch(`${BETINPUT_API_URL}/api/games/${date}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('BetInput API error (getGames):', error);
      return { date, count: 0, games: [], error: true };
    }
  },

  async calculateBet(americanOdds: number, riskPercent: number = 7.33, balance?: number) {
    try {
      const response = await fetch(`${BETINPUT_API_URL}/api/calculate-bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          american_odds: americanOdds, 
          risk_percent: riskPercent,
          balance: balance
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('BetInput API error (calculateBet):', error);
      throw error;
    }
  },

  async createBet(betData: BetData) {
    try {
      const response = await fetch(`${BETINPUT_API_URL}/api/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('BetInput API error (createBet):', error);
      throw error;
    }
  },

  async getBets(status?: string) {
    try {
      const url = status ? `${BETINPUT_API_URL}/api/bets?status=${status}` : `${BETINPUT_API_URL}/api/bets`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('BetInput API error (getBets):', error);
      return { bets: [], error: true };
    }
  },

  async getPortfolio() {
    try {
      const response = await fetch(`${BETINPUT_API_URL}/api/portfolio`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('BetInput API error (getPortfolio):', error);
      return { balance: 150.0, risk_percent: 7.33, error: true };
    }
  }
};

