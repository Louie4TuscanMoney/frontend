import { createSignal, onMount, Show, For } from 'solid-js';
import { data1Api, mcs1Api, DailyMCSFile } from '../api/clients';
import '../styles/MCSResults.css';

export default function MCSResults() {
  const [predictions, setPredictions] = createSignal<DailyMCSFile[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [running, setRunning] = createSignal(false);
  const [runStatus, setRunStatus] = createSignal<string>('');
  const [selectedDate, setSelectedDate] = createSignal<string>('');

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Initialize with today's date
  onMount(() => {
    const today = getTodayDate();
    setSelectedDate(today);
    loadPredictions(today);
    checkRunStatus();
    // Check run status every 5 seconds
    const interval = setInterval(checkRunStatus, 5000);
    return () => clearInterval(interval);
  });

  async function loadPredictions(date: string) {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout wrapper to ensure loading state is cleared
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please try again')), 20000);
      });
      
      const data = await Promise.race([
        data1Api.getDailyMCS(date),
        timeoutPromise
      ]) as any;
      
      setPredictions(data.files || []);
      
      // Only show error if there's an actual error AND no files
      // Empty results are OK - just means no predictions for that date
      if (data.count === 0 && (!data.files || data.files.length === 0)) {
        // No error - just no data (this is normal for dates without predictions)
        setError(null);
      }
    } catch (err: any) {
      console.error('Error loading predictions:', err);
      // Set error message for user feedback
      if (err.message) {
        if (err.message.includes('timeout')) {
          setError('Request timed out. The server may be slow or unavailable.');
        } else if (!err.message.includes('No data found')) {
          setError(err.message || 'Failed to load predictions');
        } else {
          setError(null);
        }
      } else {
        setError('Failed to load predictions. Please try again.');
      }
      setPredictions([]);
    } finally {
      // Always clear loading state, even on error
      setLoading(false);
    }
  }

  async function checkRunStatus() {
    try {
      const status = await mcs1Api.getRunStatus();
      setRunning(status.running);
    } catch (err) {
      console.warn('Could not check run status:', err);
    }
  }

  async function handleTriggerMasterPy() {
    try {
      const today = getTodayDate();
      setRunStatus(`Starting Master.py for today (${today})...`);
      const result = await mcs1Api.triggerMasterPy();
      setRunStatus(result.message || 'Master.py started successfully');
      setRunning(true);
      
      // Poll for completion and show logs
      const pollInterval = setInterval(async () => {
        try {
          const status = await mcs1Api.getRunStatus();
          if (!status.running) {
            clearInterval(pollInterval);
            setRunStatus('Master.py completed! Loading results...');
            setRunning(false);
            // Load today's predictions after completion
            loadPredictions(today);
            // Also refresh selected date if it's today
            if (selectedDate() === today) {
              loadPredictions(today);
            }
          }
        } catch (err) {
          console.warn('Error checking status:', err);
        }
      }, 5000); // Check every 5 seconds
      
      // Refresh predictions after a delay (Master.py takes time)
      setTimeout(() => {
        loadPredictions(today);
      }, 30000); // Refresh after 30 seconds
    } catch (err: any) {
      setRunStatus(`Error: ${err.message || 'Failed to trigger Master.py'}`);
      setRunning(false);
      console.error('Error triggering Master.py:', err);
    }
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    loadPredictions(date);
  }

  function formatDate(dateStr: string): string {
    // Parse YYYY-MM-DD format correctly (don't use Date constructor which can be timezone-sensitive)
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  function getGameInfo(file: DailyMCSFile) {
    const data = file.data || {};
    return {
      awayTeam: data.away_team || 'Unknown',
      homeTeam: data.home_team || 'Unknown',
      gameId: data.game_id || '',
      gameDate: data.game_date || selectedDate(),
      generatedAt: data.generated_at || '',
      winProbabilities: data.win_probabilities || {},
      impliedProbability: data.implied_probability || {},
      spreadComparison: data.spread_odds_comparison || {},
      fileName: file.name || ''
    };
  }

  // Group files by game_id and get the most recent one for each game
  function getLatestFilesByGame(files: DailyMCSFile[]): DailyMCSFile[] {
    const gameMap = new Map<number, DailyMCSFile>();
    
    files.forEach(file => {
      const gameId = file.data?.game_id;
      if (!gameId) return;
      
      // Extract timestamp from filename (format: ..._YYYYMMDD_HHMMSS.json)
      const timestampMatch = file.name.match(/_(\d{8}_\d{6})\.json$/);
      const fileTimestamp = timestampMatch ? timestampMatch[1] : '';
      
      const existing = gameMap.get(gameId);
      if (!existing) {
        gameMap.set(gameId, file);
      } else {
        // Compare timestamps - keep the most recent
        const existingTimestamp = existing.name.match(/_(\d{8}_\d{6})\.json$/)?.[1] || '';
        if (fileTimestamp > existingTimestamp) {
          gameMap.set(gameId, file);
        }
      }
    });
    
    return Array.from(gameMap.values());
  }

  function formatSpreadDisplay(spreadComparison: any): string {
    if (!spreadComparison) return '';
    
    const homeSpread = spreadComparison.home_team_spread;
    const awaySpread = spreadComparison.away_team_spread;
    
    if (homeSpread && awaySpread) {
      // Format as "home_spread-away_spread" (e.g., "2.5--2.5" or "11-24")
      // Show absolute values for cleaner display
      const home = Math.abs(homeSpread.spread || 0);
      const away = Math.abs(awaySpread.spread || 0);
      return `(${home}-${away})`;
    }
    
    return '';
  }

  function formatFileName(fileName: string): string {
    // Extract just the filename without path
    const name = fileName.split('/').pop() || fileName;
    // Remove the .json extension for cleaner display
    return name.replace('.json', '');
  }

  return (
    <div class="mcs-results">
      <div class="mcs-header">
        <h1>📊 MCS Predictions</h1>
        <div class="header-controls">
          <div class="date-selector">
            <label for="date-input">Date:</label>
            <input
              id="date-input"
              type="date"
              value={selectedDate()}
              onInput={(e) => handleDateChange(e.currentTarget.value)}
              max={getTodayDate()}
            />
          </div>
          <button
            class={`run-button ${running() ? 'running' : ''}`}
            onClick={handleTriggerMasterPy}
            disabled={running()}
          >
            {running() ? '⏳ Running...' : '🚀 Run Master.py'}
          </button>
        </div>
      </div>

      <Show when={runStatus()}>
        <div class={`status-message ${running() ? 'running' : ''}`}>
          {runStatus()}
        </div>
      </Show>

      <Show when={selectedDate()}>
        <div class="date-display">
          Showing predictions for: <strong>{formatDate(selectedDate())}</strong>
        </div>
      </Show>

      {loading() ? (
        <div class="loading">Loading predictions...</div>
      ) : error() ? (
        <div class="error-container">
          <p class="error-message">❌ {error()}</p>
          <p class="error-hint">
            {error()?.includes('404') 
              ? 'No predictions found for this date. Try running Master.py to generate predictions.'
              : 'Make sure data1 API is accessible. Check Railway deployment.'}
          </p>
        </div>
      ) : predictions().length === 0 ? (
        <div class="no-predictions">
          <p>No predictions found for {formatDate(selectedDate())}</p>
          <p class="hint">Click "Run Master.py" to generate predictions for today's games.</p>
        </div>
      ) : (
        <div class="predictions-container">
          <div class="predictions-header">
            {(() => {
              const latestFiles = getLatestFilesByGame(predictions());
              return <h2>{latestFiles.length} Game{latestFiles.length !== 1 ? 's' : ''} Found</h2>;
            })()}
          </div>
          
          <div class="predictions-grid">
            <For each={getLatestFilesByGame(predictions())}>
              {(file) => {
                const gameInfo = getGameInfo(file);
                const homeWinProb = gameInfo.winProbabilities?.home_team || 0;
                const awayWinProb = gameInfo.winProbabilities?.away_team || 0;
                const spreadDisplay = formatSpreadDisplay(gameInfo.spreadComparison);
                
                return (
                  <div class="prediction-card">
                    <div class="card-header">
                      <h3>{gameInfo.awayTeam} @ {gameInfo.homeTeam}</h3>
                      <div class="file-info">
                        <span class="filename">
                          {formatFileName(gameInfo.fileName)} {spreadDisplay}
                        </span>
                        <Show when={gameInfo.generatedAt}>
                          <span class="timestamp">
                            Generated: {new Date(gameInfo.generatedAt).toLocaleString()}
                          </span>
                        </Show>
                      </div>
                    </div>
                    
                    <div class="win-probabilities">
                      <div class="prob-row">
                        <span class="team-name">{gameInfo.awayTeam}</span>
                        <span class="probability">{(awayWinProb * 100).toFixed(1)}%</span>
                      </div>
                      <div class="prob-row">
                        <span class="team-name">{gameInfo.homeTeam}</span>
                        <span class="probability">{(homeWinProb * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    <Show when={file.data?.spread_odds_comparison}>
                      <div class="spread-info">
                        <h4>Spread Analysis</h4>
                        <Show when={file.data.spread_odds_comparison.home_team_spread}>
                          <div class="spread-row">
                            <span>Home Spread:</span>
                            <span>{file.data.spread_odds_comparison.home_team_spread.spread}</span>
                            <span class="mcs-prob">
                              MCS: {(file.data.spread_odds_comparison.home_team_spread.mcs_probability * 100).toFixed(1)}%
                            </span>
                          </div>
                        </Show>
                        <Show when={file.data.spread_odds_comparison.away_team_spread}>
                          <div class="spread-row">
                            <span>Away Spread:</span>
                            <span>{file.data.spread_odds_comparison.away_team_spread.spread}</span>
                            <span class="mcs-prob">
                              MCS: {(file.data.spread_odds_comparison.away_team_spread.mcs_probability * 100).toFixed(1)}%
                            </span>
                          </div>
                        </Show>
                      </div>
                    </Show>

                    <details class="full-data">
                      <summary>View Full Data</summary>
                      <pre>{JSON.stringify(file.data, null, 2)}</pre>
                    </details>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      )}
    </div>
  );
}

