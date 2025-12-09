import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { nbaApi, shapApi, NBAGame, SHAPPrediction } from '../api/clients';
import '../styles/GameDetail.css';

export default function GameDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [game, setGame] = createSignal<NBAGame | null>(null);
  const [shap, setShap] = createSignal<SHAPPrediction | null>(null);
  const [rosters, setRosters] = createSignal<any>(null);
  const [records, setRecords] = createSignal<any>(null);
  const [playByPlay, setPlayByPlay] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [activeTab, setActiveTab] = createSignal<'overview' | 'rosters' | 'playbyplay'>('overview');

  let interval: number;

  onMount(async () => {
    // Set a shorter timeout to ensure loading always resolves
    const timeoutId = setTimeout(() => {
      if (loading()) {
        console.warn('Game loading timeout - showing error state');
        setError('Game data is taking longer than expected. Please try refreshing.');
        setLoading(false);
      }
    }, 3000); // 3 second timeout (reduced from 5)

    try {
      // Load game and SHAP in parallel - show UI immediately when game loads
      await loadGame();
      setLoading(false); // Show UI as soon as game data loads
      
      // Load additional data in background (don't block UI)
      loadAdditionalData().catch(err => {
        console.error('Error loading additional data:', err);
        // Don't set error - these are optional features
      });
    } catch (err) {
      console.error('Error in onMount:', err);
      setError('Failed to load game. Please try again.');
      setLoading(false);
    } finally {
      clearTimeout(timeoutId);
    }

    // Refresh every 5 seconds for live games
    interval = setInterval(async () => {
      const currentGame = game();
      if (currentGame && currentGame.gameStatusText !== 'Final' && currentGame.gameStatusText !== 'Scheduled') {
        await loadGame().catch(err => console.error('Error refreshing game:', err));
        await loadPlayByPlay().catch(err => console.error('Error refreshing play-by-play:', err));
      }
    }, 5000);
  });

  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  async function loadGame() {
    try {
      setError(null);
      
      // Load game and SHAP in TRUE parallel (both start immediately)
      const gamePromise = nbaApi.getGameById(params.gameId);
      const shapPromise = shapApi.getPredictionForGame(params.gameId);
      
      // Race both promises - show game as soon as it loads, SHAP when ready
      const [gameData, shapData] = await Promise.allSettled([
        Promise.race([
          gamePromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)) // 2 second timeout
        ]),
        Promise.race([
          shapPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)) // 2 second timeout
        ])
      ]);

      // Handle game data
      const gameResult = gameData.status === 'fulfilled' ? gameData.value : null;
      if (!gameResult) {
        setError('Game not found. It may have been removed or the game ID is invalid.');
        return;
      }
      
      // Set game immediately - UI shows right away
      setGame(gameResult);
      
      // Handle SHAP data (non-blocking)
      if (shapData.status === 'fulfilled' && shapData.value) {
        setShap(shapData.value);
      }
      
    } catch (error) {
      console.error('Error loading game:', error);
      setError('Failed to load game data. Please check your connection and try again.');
    }
  }

  async function loadAdditionalData() {
    try {
      // Load additional data in parallel with shorter timeout
      const timeout = 5000; // 5 second timeout (reduced from 8)
      
      // Load records first (fastest, most useful)
      nbaApi.getGameRecords(params.gameId)
        .then(data => setRecords(data))
        .catch(() => {}); // Silent fail
      
      // Load rosters (can be slower)
      nbaApi.getGameRosters(params.gameId)
        .then(data => setRosters(data))
        .catch(() => {}); // Silent fail
      
      // Load play-by-play only if game is live
      const currentGame = game();
      if (currentGame && currentGame.gameStatusText !== 'Scheduled' && currentGame.gameStatusText !== 'Final') {
        nbaApi.getPlayByPlay(params.gameId)
          .then(data => setPlayByPlay(data))
          .catch(() => {}); // Silent fail
      }
    } catch (error) {
      console.error('Error loading additional data:', error);
      // Don't set error - these are optional features
    }
  }

  async function loadPlayByPlay() {
    try {
      const data = await nbaApi.getPlayByPlay(params.gameId);
      setPlayByPlay(data);
    } catch (error) {
      console.error('Error loading play-by-play:', error);
    }
  }

  function handlePlaceBet() {
    navigate(`/bet/${params.gameId}`);
  }

  if (loading()) {
    return (
      <div class="game-detail loading">
        <div class="loading-spinner"></div>
        <p>Loading game data...</p>
        <small>This may take a few seconds</small>
      </div>
    );
  }

  const currentGame = game();
  const errorMessage = error();
  
  if (errorMessage || !currentGame) {
    return (
      <div class="game-detail error-state">
        <button class="back-button" onclick={() => navigate('/')}>
          ← Back to Games
        </button>
        <div class="error-container">
          <h2>⚠️ Unable to Load Game</h2>
          <p>{errorMessage || 'Game not found. It may have been removed or the game ID is invalid.'}</p>
          <div class="error-actions">
            <button class="retry-button" onclick={async () => {
              setLoading(true);
              setError(null);
              await loadGame();
              setLoading(false);
            }}>
              🔄 Retry
            </button>
            <button class="back-button" onclick={() => navigate('/')}>
              ← Back to Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shapData = shap();
  const rostersData = rosters();
  const recordsData = records();
  const playByPlayData = playByPlay();
  const isLive = currentGame.gameStatusText !== 'Scheduled' && currentGame.gameStatusText !== 'Final';

  function formatPlayerName(player: any): string {
    if (player.PLAYER) return player.PLAYER;
    if (player.PlayerName) return player.PlayerName;
    if (player.firstName && player.lastName) return `${player.firstName} ${player.lastName}`;
    return 'Unknown Player';
  }

  function formatAction(action: any): string {
    const actionType = action.actionType || action.type || '';
    const description = action.description || action.text || '';
    const player = action.playerName || action.playerNameI || '';
    const team = action.teamTricode || '';
    
    if (description) return description;
    if (player && actionType) return `${player} - ${actionType}`;
    return actionType || 'Play';
  }

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
            <Show when={recordsData?.awayTeam?.record}>
              <div class="team-record">
                {recordsData.awayTeam.record.wins}-{recordsData.awayTeam.record.losses}
                {' '}({((recordsData.awayTeam.record.winPercentage || 0) * 100).toFixed(1)}%)
              </div>
            </Show>
          </div>
          <div class="vs">@</div>
          <div class="team-detail home">
            <h2>{currentGame.homeTeam.teamName}</h2>
            <div class="score-large">{currentGame.homeTeam.score}</div>
            <Show when={recordsData?.homeTeam?.record}>
              <div class="team-record">
                {recordsData.homeTeam.record.wins}-{recordsData.homeTeam.record.losses}
                {' '}({((recordsData.homeTeam.record.winPercentage || 0) * 100).toFixed(1)}%)
              </div>
            </Show>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button 
          class={`tab-button ${activeTab() === 'overview' ? 'active' : ''}`}
          onclick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          class={`tab-button ${activeTab() === 'rosters' ? 'active' : ''}`}
          onclick={() => setActiveTab('rosters')}
        >
          Rosters
        </button>
        <Show when={isLive || playByPlayData?.actions?.length > 0}>
          <button 
            class={`tab-button ${activeTab() === 'playbyplay' ? 'active' : ''}`}
            onclick={() => setActiveTab('playbyplay')}
          >
            Play-by-Play
          </button>
        </Show>
      </div>

      <Show when={activeTab() === 'overview'}>
        <div class="shap-section">
          <h3>SHAP Predictions</h3>
          <Show when={shapData()} fallback={
            <div class="shap-loading">
              <div class="shap-loading-spinner"></div>
              <p>Loading SHAP predictions...</p>
            </div>
          }>
            <div class="shap-data-container">
              {shapData()?.prediction && typeof shapData()?.prediction === 'object' ? (
                <div class="shap-data-grid">
                  {Object.entries(shapData()!.prediction).map(([key, value]) => (
                    <div class="shap-data-item">
                      <span class="shap-key">{key}:</span>
                      <span class="shap-value">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre class="shap-data">{JSON.stringify(shapData()?.prediction, null, 2)}</pre>
              )}
            </div>
          </Show>
        </div>

        <div class="game-actions">
          <button class="bet-button-large" onclick={handlePlaceBet}>
            🎲 Place Bet on This Game
          </button>
        </div>
      </Show>

      <Show when={activeTab() === 'rosters' && rostersData}>
        <div class="rosters-section">
          <div class="roster-container">
            <h3>{rostersData.awayTeam?.teamName || 'Away Team'} Roster</h3>
            <div class="roster-table">
              <div class="roster-header">
                <span>Player</span>
                <span>Position</span>
                <span>Number</span>
              </div>
              <For each={rostersData.awayTeam?.roster || []}>
                {(player) => (
                  <div class="roster-row">
                    <span>{formatPlayerName(player)}</span>
                    <span>{player.POSITION || player.position || 'N/A'}</span>
                    <span>{player.NUM || player.jerseyNumber || 'N/A'}</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div class="roster-container">
            <h3>{rostersData.homeTeam?.teamName || 'Home Team'} Roster</h3>
            <div class="roster-table">
              <div class="roster-header">
                <span>Player</span>
                <span>Position</span>
                <span>Number</span>
              </div>
              <For each={rostersData.homeTeam?.roster || []}>
                {(player) => (
                  <div class="roster-row">
                    <span>{formatPlayerName(player)}</span>
                    <span>{player.POSITION || player.position || 'N/A'}</span>
                    <span>{player.NUM || player.jerseyNumber || 'N/A'}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      <Show when={activeTab() === 'playbyplay' && playByPlayData}>
        <div class="playbyplay-section">
          <h3>Play-by-Play</h3>
          <Show when={playByPlayData.actions && playByPlayData.actions.length > 0} fallback={
            <div class="no-plays">No play-by-play data available yet. Check back when the game starts!</div>
          }>
            <div class="playbyplay-list">
              <For each={[...(playByPlayData.actions || [])].reverse()}>
                {(action, index) => (
                  <div class="play-item">
                    <span class="play-period">Q{action.period || action.periodValue || '?'}</span>
                    <span class="play-clock">{action.clock || action.timeActual || ''}</span>
                    <span class="play-description">{formatAction(action)}</span>
                    <Show when={action.scoreHome !== undefined && action.scoreAway !== undefined}>
                      <span class="play-score">
                        {action.scoreAway} - {action.scoreHome}
                      </span>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

