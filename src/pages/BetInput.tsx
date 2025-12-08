import { createSignal, onMount, Show, For } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { betInputApi, nbaApi, NBAGame } from '../api/clients';
import '../styles/BetInput.css';

export default function BetInput() {
  const params = useParams();
  const navigate = useNavigate();
  
  const [balance, setBalance] = createSignal(0);
  const [games, setGames] = createSignal<any[]>([]);
  const [selectedGame, setSelectedGame] = createSignal<any>(null);
  const [teamSelected, setTeamSelected] = createSignal('');
  const [betType] = createSignal('Point Spread'); // Always Point Spread
  const [spread, setSpread] = createSignal<number | null>(null);
  const [spreadSign, setSpreadSign] = createSignal<'+' | '-'>('-');
  const [americanOdds, setAmericanOdds] = createSignal('');
  const [riskPercent, setRiskPercent] = createSignal(7.33);
  
  const [betCalculation, setBetCalculation] = createSignal<any>(null);
  const [calculating, setCalculating] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [message, setMessage] = createSignal('');

  onMount(async () => {
    await loadData();
    
    // If gameId in URL, auto-select it
    if (params.gameId) {
      const game = games().find(g => g.game_id === params.gameId);
      if (game) {
        setSelectedGame(game);
      }
    }
  });

  async function loadData() {
    try {
      // Load balance and games from NBA API (more reliable)
      const [balanceData, nbaGames] = await Promise.all([
        betInputApi.getBalance(),
        nbaApi.getAllGames()
      ]);
      setBalance(balanceData.balance || 0);
      
      // Convert NBA games to BetInput format
      const formattedGames = nbaGames.map(game => ({
        game_id: String(game.gameId),
        visitor_team_name: game.awayTeam.teamName,
        home_team_name: game.homeTeam.teamName,
        home_team_id: game.homeTeam.teamId,
        away_team_id: game.awayTeam.teamId,
        game_status: game.gameStatusText,
        game_time: game.formattedClock || game.gameClock
      }));
      setGames(formattedGames);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data');
    }
  }

  async function calculateBet() {
    const odds = parseFloat(americanOdds());
    if (!odds || !selectedGame()) {
      setMessage('Please select a game and enter odds');
      return;
    }

    setCalculating(true);
    try {
      const result = await betInputApi.calculateBet(odds, riskPercent());
      setBetCalculation(result);
      setMessage('');
    } catch (error) {
      console.error('Error calculating bet:', error);
      setMessage('Error calculating bet');
    } finally {
      setCalculating(false);
    }
  }

  async function submitBet() {
    const calc = betCalculation();
    if (!calc || !selectedGame()) {
      setMessage('Please calculate bet first');
      return;
    }

    setSubmitting(true);
    try {
      const game = selectedGame();
      const betData = {
        game_id: String(game.game_id || game.gameId),
        home_team: game.home_team_name || game.homeTeam?.teamName,
        away_team: game.visitor_team_name || game.away_team_name || game.awayTeam?.teamName,
        home_team_id: game.home_team_id || game.homeTeam?.teamId,
        away_team_id: game.away_team_id || game.awayTeam?.teamId,
        team_selected: teamSelected(),
        bet_type: 'Point Spread', // Always Point Spread
        spread: spread(),
        american_odds: parseFloat(americanOdds()),
        risk_percent: riskPercent()
      };

      const result = await betInputApi.createBet(betData);
      setMessage('Bet placed successfully!');
      setBalance(result.balance || balance());
      
      // Reset form and navigate to Portfolio to show new bet
      setTimeout(() => {
        navigate('/portfolio');
      }, 1500);
    } catch (error: any) {
      console.error('Error placing bet:', error);
      setMessage(error.message || 'Error placing bet');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="bet-input">
      <button class="back-button" onclick={() => navigate('/')}>
        ← Back to Games
      </button>

      <div class="bet-header">
        <h1>Place Bet</h1>
        <div class="balance-display">
          Balance: <span class="balance-amount">${balance().toFixed(2)}</span>
        </div>
      </div>

      <Show when={message()}>
        <div class={`message ${message().includes('success') ? 'success' : 'error'}`}>
          {message()}
        </div>
      </Show>

      <div class="bet-form">
        <div class="form-group">
          <label>Select Game</label>
          <select 
            value={selectedGame()?.game_id || ''} 
            onChange={(e) => {
              const game = games().find(g => g.game_id === e.target.value);
              setSelectedGame(game || null);
            }}
          >
            <option value="">Select a game...</option>
            <For each={games()}>
              {(game) => (
                <option value={game.game_id}>
                  {game.visitor_team_name || game.away_team_name} @ {game.home_team_name}
                  {game.game_time ? ` (${game.game_time})` : ''}
                </option>
              )}
            </For>
          </select>
        </div>

        <Show when={selectedGame()}>
          <div class="form-group">
            <label>Select Team</label>
            <select 
              value={teamSelected()}
              onChange={(e) => {
                const value = e.target.value;
                setTeamSelected(value);
                // Auto-extract spread from team selection if format is "Team -4.5"
                const match = value.match(/(.+?)\s*([+-]?\d+\.?\d*)$/);
                if (match) {
                  setTeamSelected(match[1].trim());
                  const spreadVal = parseFloat(match[2]);
                  setSpread(spreadVal);
                  setSpreadSign(spreadVal >= 0 ? '+' : '-');
                }
              }}
            >
              <option value="">Select a team...</option>
              <option value={`${selectedGame()?.awayTeam?.teamName || selectedGame()?.visitor_team_name || selectedGame()?.away_team_name}`}>
                {selectedGame()?.awayTeam?.teamName || selectedGame()?.visitor_team_name || selectedGame()?.away_team_name} (Away)
              </option>
              <option value={`${selectedGame()?.homeTeam?.teamName || selectedGame()?.home_team_name}`}>
                {selectedGame()?.homeTeam?.teamName || selectedGame()?.home_team_name} (Home)
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Spread</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <select 
                value={spreadSign()}
                onChange={(e) => {
                  const newSign = e.target.value as '+' | '-';
                  setSpreadSign(newSign);
                  // Update spread value with new sign
                  const currentSpread = spread();
                  if (currentSpread !== null && currentSpread !== undefined) {
                    const absValue = Math.abs(currentSpread);
                    setSpread(newSign === '+' ? absValue : -absValue);
                  } else {
                    // If no value yet, set a default with the selected sign
                    setSpread(newSign === '+' ? 0.5 : -0.5);
                  }
                }}
                style="width: 60px;"
              >
                <option value="-">-</option>
                <option value="+">+</option>
              </select>
              <input 
                type="number" 
                step="0.5"
                min="0"
                placeholder="4.5"
                value={(() => {
                  const s = spread();
                  return s !== null && s !== undefined ? Math.abs(s) : '';
                })()}
                onInput={(e) => {
                  const val = parseFloat(e.target.value);
                  if (isNaN(val) || val <= 0) {
                    setSpread(null);
                    return;
                  }
                  // Use the current sign from spreadSign signal
                  const sign = spreadSign() === '+' ? 1 : -1;
                  setSpread(sign * val);
                }}
                style="flex: 1;"
              />
            </div>
            <small style="color: #94a3b8; margin-top: 0.25rem; display: block;">
              Enter spread (e.g., -4.5 means team must win by more than 4.5 points, +4.5 means team can lose by less than 4.5)
            </small>
          </div>

          <div class="form-group">
            <label>American Odds</label>
            <input 
              type="number"
              placeholder="e.g., -110, +150"
              value={americanOdds()}
              onInput={(e) => setAmericanOdds(e.target.value)}
            />
          </div>

          <div class="form-group">
            <label>Risk % (Kelly Criterion)</label>
            <input 
              type="number"
              step="0.01"
              value={riskPercent()}
              onInput={(e) => setRiskPercent(parseFloat(e.target.value) || 7.33)}
            />
          </div>

          <button 
            class="calculate-button"
            onclick={calculateBet}
            disabled={calculating()}
          >
            {calculating() ? 'Calculating...' : 'Calculate Bet'}
          </button>

          <Show when={betCalculation()}>
            <div class="bet-calculation">
              <h3>Bet Summary</h3>
              <div class="calc-row">
                <span>Bet Amount:</span>
                <strong>${betCalculation()?.bet_amount?.toFixed(2)}</strong>
              </div>
              <div class="calc-row">
                <span>Payout if Wins:</span>
                <strong>${betCalculation()?.payout?.toFixed(2)}</strong>
              </div>
              <div class="calc-row">
                <span>Profit:</span>
                <strong>${betCalculation()?.profit?.toFixed(2)}</strong>
              </div>
              <div class="calc-row">
                <span>ROI:</span>
                <strong>{betCalculation()?.roi?.toFixed(2)}%</strong>
              </div>
              <div class="calc-row">
                <span>Win Probability:</span>
                <strong>{(betCalculation()?.win_probability_percent || 0).toFixed(2)}%</strong>
              </div>

              <button 
                class="submit-button"
                onclick={submitBet}
                disabled={submitting()}
              >
                {submitting() ? 'Placing Bet...' : 'Place Bet'}
              </button>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

