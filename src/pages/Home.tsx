import { createSignal, onMount, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { nbaApi, shapApi, NBAGame, SHAPPrediction } from '../api/clients';
import '../styles/Home.css';

export default function Home() {
  const [games, setGames] = createSignal<NBAGame[]>([]);
  const [shapPredictions, setShapPredictions] = createSignal<SHAPPrediction[]>([]);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  // Load games and predictions
  onMount(async () => {
    await loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  });

  async function loadData() {
    try {
      setLoading(true);
      
      // Load NBA games first (critical) - show immediately
      const nbaGamesPromise = nbaApi.getAllGames().catch(err => {
        console.error('NBA API error:', err);
        return [];
      });
      
      // Load SHAP in parallel but don't block UI
      const shapPromise = shapApi.getPredictions().catch(err => {
        console.warn('SHAP API error (non-critical):', err);
        return [];
      });
      
      // Show games as soon as they load (don't wait for SHAP)
      const nbaGames = await nbaGamesPromise;
      setGames(nbaGames || []);
      setLoading(false); // Show UI immediately
      
      // Set SHAP when it arrives (non-blocking)
      shapPromise.then(shap => {
        console.log(`📊 Loaded ${shap?.length || 0} SHAP predictions`);
        setShapPredictions(shap || []);
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  function getShapForGame(gameId: string): SHAPPrediction | undefined {
    return shapPredictions().find(p => 
      String(p.game_id) === String(gameId) || 
      String(p.gameId) === String(gameId)
    );
  }

  function handleGameClick(game: NBAGame) {
    // Pass game data and SHAP via navigation state for instant loading
    const shapForGame = getShapForGame(game.gameId);
    navigate(`/game/${game.gameId}`, {
      state: {
        game: game,
        shap: shapForGame
      }
    });
  }

  function handleBetClick(gameId?: string) {
    if (gameId) {
      navigate(`/bet/${gameId}`);
    } else {
      navigate('/bet');
    }
  }

  return (
    <div class="home">
      <div class="header">
        <h1>NBA Games</h1>
        <button class="bet-button" onclick={() => handleBetClick()}>
          🎲 Place Bet
        </button>
      </div>

      {loading() ? (
        <div class="loading">Loading games...</div>
      ) : games().length === 0 ? (
        <div class="no-games">
          <p>No games found</p>
          <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
            {import.meta.env.DEV 
              ? 'Make sure NBA API is running. Check .env file for API URLs.'
              : 'No games scheduled or API connection issue. Check Railway deployment.'}
          </p>
          <p style="font-size: 0.9rem; color: #666;">
            Check browser console (F12) for errors
          </p>
          <p style="font-size: 0.8rem; color: #999; margin-top: 0.5rem;">
            NBA API: {import.meta.env.VITE_NBA_API_URL || 'using default'}
          </p>
        </div>
      ) : (
        <div class="games-grid">
          <For each={games()}>
            {(game) => {
              const shap = getShapForGame(game.gameId);
              // Check if game is actually live (has started and not final)
              // Live = has gameClock with time (not empty), period > 0, and not Final
              const hasStarted = game.gameClock && 
                                game.gameClock.trim() !== '' && 
                                game.period && 
                                game.period > 0;
              const isFinal = game.gameStatusText === 'Final' || 
                             game.gameStatusText?.includes('Final');
              const isLive = hasStarted && !isFinal;
              
              // Scheduled = has time in status (pm/am/ET) or period is 0/undefined
              const isScheduled = !hasStarted && !isFinal && 
                                 (game.gameStatusText?.includes('pm') || 
                                  game.gameStatusText?.includes('am') ||
                                  game.gameStatusText?.includes('ET') ||
                                  game.formattedClock ||
                                  (!game.period || game.period === 0));
              
              return (
                <div 
                  class={`game-tile ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''}`}
                  onclick={() => handleGameClick(game)}
                >
                  <div class="game-status">
                    {isLive && <span class="live-indicator">🔴 LIVE</span>}
                    {isFinal && <span class="final-badge">Final</span>}
                    {isScheduled && (
                      <span class="time">{game.formattedClock || game.gameClock || game.gameStatusText}</span>
                    )}
                    {isLive && game.period && <span class="period">Q{game.period}</span>}
                  </div>

                  <div class="game-teams">
                    <div class="team away">
                      <span class="team-name">{game.awayTeam.teamName}</span>
                      <span class="score">{game.awayTeam.score}</span>
                    </div>
                    <div class="team home">
                      <span class="team-name">{game.homeTeam.teamName}</span>
                      <span class="score">{game.homeTeam.score}</span>
                    </div>
                  </div>

                  {shap && (
                    <div class="shap-badge">
                      📊 SHAP Available
                    </div>
                  )}

                  <div class="game-actions">
                    <button 
                      class="bet-btn-small"
                      onclick={(e) => {
                        e.stopPropagation();
                        handleBetClick(game.gameId);
                      }}
                    >
                      Place Bet
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      )}
    </div>
  );
}

