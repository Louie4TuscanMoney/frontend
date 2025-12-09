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
    const componentId = `MCS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[MCS_COMPONENT] [${new Date().toISOString()}] [COMPONENT_ID:${componentId}] Component mounted`);
    
    const today = getTodayDate();
    console.log(`[MCS_COMPONENT] [${new Date().toISOString()}] [COMPONENT_ID:${componentId}] Initializing with today's date: ${today}`);
    
    setSelectedDate(today);
    loadPredictions(today);
    checkRunStatus();
    
    // Check run status every 5 seconds
    const interval = setInterval(() => {
      console.log(`[MCS_COMPONENT] [${new Date().toISOString()}] [COMPONENT_ID:${componentId}] Polling run status`);
      checkRunStatus();
    }, 5000);
    
    console.log(`[MCS_COMPONENT] [${new Date().toISOString()}] [COMPONENT_ID:${componentId}] Status polling interval started (5s)`);
    
    return () => {
      clearInterval(interval);
      console.log(`[MCS_COMPONENT] [${new Date().toISOString()}] [COMPONENT_ID:${componentId}] Component unmounted, interval cleared`);
    };
  });

  async function loadPredictions(date: string) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Loading predictions for date: ${date}`);
    
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout wrapper to ensure loading state is cleared
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please try again')), 20000);
      });
      
      const apiStartTime = performance.now();
      const data = await Promise.race([
        data1Api.getDailyMCS(date),
        timeoutPromise
      ]) as any;
      const apiElapsed = performance.now() - apiStartTime;
      
      console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] API call completed in ${apiElapsed.toFixed(0)}ms`);
      
      const fileCount = data.files?.length || 0;
      console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Received ${fileCount} files from API`);
      
      // Log file details for debugging
      if (fileCount > 0) {
        console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Sample files:`, 
          data.files.slice(0, 3).map((f: any) => ({
            name: f.name,
            game_id: f.data?.game_id,
            generated_at: f.data?.generated_at
          }))
        );
      }
      
      if (data.performance) {
        console.log(`[PERF] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Backend performance metrics:`, data.performance);
      }
      
      setPredictions(data.files || []);
      console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Predictions state updated with ${fileCount} files`);
      
      // Group and filter files
      const groupedStart = performance.now();
      const latestFiles = getLatestFilesByGame(data.files || []);
      const groupedElapsed = performance.now() - groupedStart;
      
      console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Grouped ${fileCount} files to ${latestFiles.length} unique games in ${groupedElapsed.toFixed(0)}ms`);
      
      // Log game IDs for verification
      if (latestFiles.length > 0) {
        const gameIds = latestFiles.map((f: DailyMCSFile) => f.data?.game_id).filter(Boolean);
        console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Unique game IDs:`, gameIds);
      }
      
      // Only show error if there's an actual error AND no files
      // Empty results are OK - just means no predictions for that date
      if (data.count === 0 && (!data.files || data.files.length === 0)) {
        // No error - just no data (this is normal for dates without predictions)
        setError(null);
        console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] No predictions found for ${date} (this is OK)`);
      }
      
      const totalElapsed = performance.now() - startTime;
      console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Total load time: ${totalElapsed.toFixed(0)}ms`);
      
    } catch (err: any) {
      const elapsed = performance.now() - startTime;
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error loading predictions after ${elapsed.toFixed(0)}ms:`, err);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error details:`, {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
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
      const totalElapsed = performance.now() - startTime;
      console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Loading complete (total: ${totalElapsed.toFixed(0)}ms)`);
    }
  }

  async function checkRunStatus() {
    const requestId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Checking Master.py run status`);
    
    try {
      const statusStart = performance.now();
      const status = await mcs1Api.getRunStatus();
      const statusElapsed = performance.now() - statusStart;
      
      console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Status check completed in ${statusElapsed.toFixed(0)}ms:`, {
        running: status.running,
        timestamp: status.timestamp || 'N/A'
      });
      
      const wasRunning = running();
      setRunning(status.running);
      
      if (wasRunning !== status.running) {
        console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Status changed: ${wasRunning} -> ${status.running}`);
      }
    } catch (err: any) {
      const elapsed = performance.now() - startTime;
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Could not check run status after ${elapsed.toFixed(0)}ms:`, {
        error: err.message,
        stack: err.stack,
        name: err.name
      });
    }
  }

  async function handleTriggerMasterPy() {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Triggering Master.py`);
    
    try {
      const today = getTodayDate();
      setRunStatus(`Starting Master.py for today (${today})...`);
      
      const apiStartTime = performance.now();
      const result = await mcs1Api.triggerMasterPy();
      const apiElapsed = performance.now() - apiStartTime;
      
      console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Master.py triggered in ${apiElapsed.toFixed(0)}ms`, result);
      
      setRunStatus(result.message || 'Master.py started successfully');
      setRunning(true);
      
      // Poll for completion and show logs
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const statusStart = performance.now();
          const status = await mcs1Api.getRunStatus();
          const statusElapsed = performance.now() - statusStart;
          
          console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Status check #${pollCount}: running=${status.running} (${statusElapsed.toFixed(0)}ms)`);
          
          if (!status.running) {
            clearInterval(pollInterval);
            const totalElapsed = performance.now() - startTime;
            console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Master.py completed (total: ${totalElapsed.toFixed(0)}ms)`);
            
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
          console.warn(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error checking status:`, err);
        }
      }, 5000); // Check every 5 seconds
      
      // Refresh predictions after a delay (Master.py takes time)
      setTimeout(() => {
        console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Auto-refreshing predictions after 30s`);
        loadPredictions(today);
      }, 30000); // Refresh after 30 seconds
    } catch (err: any) {
      const elapsed = performance.now() - startTime;
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error triggering Master.py after ${elapsed.toFixed(0)}ms:`, err);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error details:`, {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      setRunStatus(`Error: ${err.message || 'Failed to trigger Master.py'}`);
      setRunning(false);
    }
  }

  function handleDateChange(date: string) {
    const requestId = `date_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const oldDate = selectedDate();
    
    console.log(`[DATE_CHANGE] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Date changed: ${oldDate} -> ${date}`);
    
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
    const processId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    console.log(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] Starting grouping for ${files.length} files`);
    
    const gameMap = new Map<number, DailyMCSFile>();
    let skippedNoGameId = 0;
    let duplicatesReplaced = 0;
    
    files.forEach((file, index) => {
      const gameId = file.data?.game_id;
      if (!gameId) {
        skippedNoGameId++;
        console.warn(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] File ${index + 1}/${files.length} (${file.name}) has no game_id, skipping`);
        return;
      }
      
      // Extract timestamp from filename
      // Format: ..._gameid_YYYYMMDD_HHMMSS_YYYYMMDD_HHMMSS.json
      // We want the LAST timestamp (most recent generation time)
      const timestampMatch = file.name.match(/_(\d{8}_\d{6})\.json$/);
      const fileTimestamp = timestampMatch ? timestampMatch[1] : '';
      
      // Also try to use generated_at from data if available (more reliable)
      const generatedAt = file.data?.generated_at;
      const dataTimestamp = generatedAt ? new Date(generatedAt).getTime() : 0;
      
      const existing = gameMap.get(gameId);
      if (!existing) {
        gameMap.set(gameId, file);
        console.log(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] Added first file for game_id ${gameId}: ${file.name}`);
      } else {
        // Compare timestamps - keep the most recent
        const existingTimestamp = existing.name.match(/_(\d{8}_\d{6})\.json$/)?.[1] || '';
        const existingGeneratedAt = existing.data?.generated_at;
        const existingDataTimestamp = existingGeneratedAt ? new Date(existingGeneratedAt).getTime() : 0;
        
        // Prefer data timestamp (generated_at) if available, otherwise use filename timestamp
        let shouldReplace = false;
        if (dataTimestamp > 0 && existingDataTimestamp > 0) {
          shouldReplace = dataTimestamp > existingDataTimestamp;
          console.log(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] Comparing game_id ${gameId} by data timestamp: ${dataTimestamp} vs ${existingDataTimestamp} (replace: ${shouldReplace})`);
        } else if (fileTimestamp && existingTimestamp) {
          shouldReplace = fileTimestamp > existingTimestamp;
          console.log(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] Comparing game_id ${gameId} by filename timestamp: ${fileTimestamp} vs ${existingTimestamp} (replace: ${shouldReplace})`);
        } else if (dataTimestamp > 0) {
          shouldReplace = true; // This file has data timestamp, existing doesn't
          console.log(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] Replacing game_id ${gameId} (new file has data timestamp, old doesn't)`);
        }
        
        if (shouldReplace) {
          gameMap.set(gameId, file);
          duplicatesReplaced++;
          console.log(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] Replaced file for game_id ${gameId}: ${existing.name} -> ${file.name}`);
        } else {
          console.log(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] Kept existing file for game_id ${gameId}: ${existing.name} (newer: ${file.name})`);
        }
      }
    });
    
    const result = Array.from(gameMap.values());
    const elapsed = performance.now() - startTime;
    
    console.log(`[FILE_GROUPING] [${new Date().toISOString()}] [PROCESS_ID:${processId}] Grouping complete in ${elapsed.toFixed(0)}ms:`, {
      inputFiles: files.length,
      outputGames: result.length,
      skippedNoGameId,
      duplicatesReplaced
    });
    
    return result;
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

