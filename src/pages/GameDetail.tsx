import { createSignal, onMount, onCleanup } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { nbaApi, shapApi, NBAGame, SHAPPrediction } from '../api/clients';
import '../styles/GameDetail.css';

export default function GameDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [game, setGame] = createSignal<NBAGame | null>(null);
  const [shap, setShap] = createSignal<SHAPPrediction | null>(null);
  const [loading, setLoading] = createSignal(true);

  let interval: number;

  onMount(async () => {
    await loadGame();
    // Refresh every 5 seconds for live games
    interval = setInterval(async () => {
      const currentGame = game();
      if (currentGame && currentGame.gameStatusText !== 'Final') {
        await loadGame();
      }
    }, 5000);
  });

  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  async function loadGame() {
    try {
      setLoading(true);
      const [gameData, shapData] = await Promise.all([
        nbaApi.getGameById(params.gameId).catch(err => {
          console.error('Error loading game from NBA API:', err);
          return null;
        }),
        shapApi.getPredictionForGame(params.gameId).catch(err => {
          console.error('Error loading SHAP prediction:', err);
          return null;
        })
      ]);
      setGame(gameData);
      setShap(shapData);
    } catch (error) {
      console.error('Error loading game:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePlaceBet() {
    navigate(`/bet/${params.gameId}`);
  }

  if (loading()) {
    return <div class="game-detail loading">Loading game...</div>;
  }

  const currentGame = game();
  if (!currentGame) {
    return <div class="game-detail">Game not found</div>;
  }

  const shapData = shap();
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

      {shapData && (
        <div class="shap-section">
          <h3>SHAP Predictions</h3>
          <div class="shap-data-container">
            {shapData.prediction && typeof shapData.prediction === 'object' ? (
              <div class="shap-data-grid">
                {Object.entries(shapData.prediction).map(([key, value]) => (
                  <div class="shap-data-item">
                    <span class="shap-key">{key}:</span>
                    <span class="shap-value">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <pre class="shap-data">{JSON.stringify(shapData.prediction, null, 2)}</pre>
            )}
          </div>
        </div>
      )}

      <div class="game-actions">
        <button class="bet-button-large" onclick={handlePlaceBet}>
          🎲 Place Bet on This Game
        </button>
      </div>
    </div>
  );
}

