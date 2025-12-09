import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate, useLocation } from '@solidjs/router';
import { shapApi, NBAGame, SHAPPrediction } from '../api/clients';
import '../styles/GameDetail.css';

export default function GameDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get game data from navigation state (passed from Home page)
  const state = location.state as { game?: NBAGame; shap?: SHAPPrediction } | undefined;
  const gameData = state?.game;
  const shapDataFromHome = state?.shap;
  
  const [game, setGame] = createSignal<NBAGame | null>(gameData || null);
  const [shap, setShap] = createSignal<SHAPPrediction | null>(shapDataFromHome || null);
  const [loadingShap, setLoadingShap] = createSignal(false);

  onMount(async () => {
    // If game data wasn't passed, redirect back to home
    if (!gameData) {
      console.warn('No game data passed, redirecting to home');
      navigate('/');
      return;
    }

    // If SHAP wasn't passed, try to load it (but don't block)
    if (!shapDataFromHome) {
      setLoadingShap(true);
      try {
        const shapResult = await shapApi.getPredictionForGame(params.gameId);
        if (shapResult) {
          setShap(shapResult);
        }
      } catch (error) {
        console.warn('Could not load SHAP prediction:', error);
      } finally {
        setLoadingShap(false);
      }
    }
  });

  function handlePlaceBet() {
    navigate(`/bet/${params.gameId}`);
  }

  const currentGame = game();
  const currentShap = shap();

  if (!currentGame) {
    return (
      <div class="game-detail">
        <button class="back-button" onclick={() => navigate('/')}>
          ← Back to Games
        </button>
        <div class="error-container">
          <h2>Game not found</h2>
          <p>Please select a game from the home page.</p>
        </div>
      </div>
    );
  }

  const isLive = currentGame.gameStatusText !== 'Scheduled' && currentGame.gameStatusText !== 'Final';

  return (
    <div class="game-detail">
      <button class="back-button" onclick={() => navigate('/')}>
        ← Back to Games
      </button>

      <div class="game-header">
        <div class="game-status-banner">
          {isLive && <span class="live-indicator">🔴 LIVE</span>}
          {currentGame.gameStatusText === 'Final' && <span class="final-badge">Final</span>}
          {currentGame.formattedClock && <span class="clock">{currentGame.formattedClock}</span>}
        </div>

        <div class="game-score">
          <div class="team-detail away">
            <h2>{currentGame.awayTeam.teamName}</h2>
            <div class="score-large">{currentGame.awayTeam.score}</div>
          </div>
          <div class="vs">@</div>
          <div class="team-detail home">
            <h2>{currentGame.homeTeam.teamName}</h2>
            <div class="score-large">{currentGame.homeTeam.score}</div>
          </div>
        </div>
      </div>

      <div class="shap-section">
        <h3>📊 SHAP Predictions</h3>
        <Show when={loadingShap()}>
          <div class="shap-loading">
            <div class="shap-loading-spinner"></div>
            <p>Loading SHAP predictions...</p>
          </div>
        </Show>
        <Show when={!loadingShap() && currentShap}>
          <div class="shap-data-container">
            <Show when={currentShap?.prediction && typeof currentShap.prediction === 'object'} fallback={
              <Show when={currentShap?.prediction} fallback={
                <div class="shap-no-data">
                  <p>No prediction data available.</p>
                </div>
              }>
                <pre class="shap-data">{JSON.stringify(currentShap.prediction, null, 2)}</pre>
              </Show>
            }>
              <div class="shap-data-grid">
                {Object.entries(currentShap!.prediction as Record<string, any>).map(([key, value]) => {
                  // Format value nicely
                  const formattedValue = typeof value === 'number' 
                    ? value.toFixed(4) 
                    : String(value);
                  const isPositive = typeof value === 'number' && value > 0;
                  
                  return (
                    <div class="shap-data-item">
                      <span class="shap-key">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                      <span class={`shap-value ${isPositive ? 'positive' : typeof value === 'number' && value < 0 ? 'negative' : ''}`}>
                        {formattedValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Show>
          </div>
        </Show>
        <Show when={!loadingShap() && !currentShap}>
          <div class="shap-no-data">
            <p>No SHAP prediction available for this game.</p>
            <small>Predictions may not be generated yet for this game.</small>
          </div>
        </Show>
      </div>

      <div class="game-actions">
        <button class="bet-button-large" onclick={handlePlaceBet}>
          🎲 Place Bet on This Game
        </button>
      </div>
    </div>
  );
}
