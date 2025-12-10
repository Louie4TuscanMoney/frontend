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
  const [masterLogs, setMasterLogs] = createSignal<{
    stdout: string;
    stderr: string;
    returncode: number | null;
    status: string;
    error: string | null;
    start_time: string | null;
    end_time: string | null;
  } | null>(null);
  const [showLogs, setShowLogs] = createSignal(false);
  const [fullDataCache, setFullDataCache] = createSignal<Map<string, any>>(new Map());
  const [loadingFullData, setLoadingFullData] = createSignal<Set<string>>(new Set());
  const [gameResults, setGameResults] = createSignal<Map<number, any>>(new Map()); // game_id -> result data

  // Get today's date in YYYY-MM-DD format (using local timezone, not UTC)
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        setTimeout(() => reject(new Error('Request timeout - please try again')), 35000); // 35 seconds to match API timeout
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
      
      // Load game results for concluded games
      try {
        const resultsData = await data1Api.getDailyResults(date);
        const resultsMap = new Map<number, any>();
        if (resultsData.files && resultsData.files.length > 0) {
          resultsData.files.forEach((file: any) => {
            const gameId = file.data?.game_id;
            if (gameId && file.data?.game_status === 'Final' && file.data?.final_game) {
              resultsMap.set(parseInt(gameId.toString()), file.data);
            }
          });
          console.log(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Loaded ${resultsMap.size} game results`);
        }
        setGameResults(resultsMap);
      } catch (err) {
        console.warn(`[MCS_RESULTS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Could not load game results:`, err);
        // Don't fail the whole page if results can't be loaded
      }
      
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

  async function fetchMasterLogs() {
    const requestId = `logs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    console.log(`[FETCH_LOGS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Fetching Master.py logs`);
    
    try {
      const logs = await mcs1Api.getRunLogs();
      const elapsed = performance.now() - startTime;
      
      console.log(`[FETCH_LOGS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Logs fetched in ${elapsed.toFixed(0)}ms:`, {
        status: logs.status,
        returncode: logs.returncode,
        stdoutLength: logs.stdout?.length || 0,
        stderrLength: logs.stderr?.length || 0
      });
      
      setMasterLogs(logs);
      
      // Show logs if there's an error
      if (logs.status === 'failed' || logs.returncode !== 0) {
        setShowLogs(true);
      }
    } catch (err: any) {
      const elapsed = performance.now() - startTime;
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Could not fetch logs after ${elapsed.toFixed(0)}ms:`, {
        error: err.message,
        stack: err.stack,
        name: err.name
      });
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
        status: status.status,
        returncode: status.returncode,
        error: status.error,
        timestamp: status.timestamp || 'N/A'
      });
      
      const wasRunning = running();
      setRunning(status.running);
      
      // Update run status message
      if (status.running) {
        setRunStatus('Master.py is running...');
      } else if (status.status === 'completed') {
        setRunStatus(`Master.py completed successfully${status.returncode === 0 ? '' : ` (exit code: ${status.returncode})`}`);
      } else if (status.status === 'failed') {
        setRunStatus(`Master.py failed: ${status.error || `Exit code: ${status.returncode}`}`);
        setError(`Master.py execution failed: ${status.error || `Exit code: ${status.returncode}`}`);
      } else {
        setRunStatus('');
      }
      
      if (wasRunning !== status.running) {
        console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Status changed: ${wasRunning} -> ${status.running}`);
        
        // If it just finished, fetch logs
        if (wasRunning && !status.running) {
          fetchMasterLogs();
        }
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
      setError(null); // Clear any previous errors
      
      // Fetch logs immediately to show progress
      fetchMasterLogs();
      
      // Poll for completion and show logs
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const statusStart = performance.now();
          const status = await mcs1Api.getRunStatus();
          const statusElapsed = performance.now() - statusStart;
          
          console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Status check #${pollCount}: running=${status.running}, status=${status.status} (${statusElapsed.toFixed(0)}ms)`);
          
          // Update logs every check
          fetchMasterLogs();
          
          if (!status.running) {
            clearInterval(pollInterval);
            const totalElapsed = performance.now() - startTime;
            console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Master.py completed (total: ${totalElapsed.toFixed(0)}ms)`);
            
            // Final log fetch
            await fetchMasterLogs();
            
            if (status.status === 'completed' && status.returncode === 0) {
              setRunStatus('Master.py completed successfully! Loading results...');
              setRunning(false);
              // Load today's predictions after completion
              loadPredictions(today);
              // Also refresh selected date if it's today
              if (selectedDate() === today) {
                loadPredictions(today);
              }
            } else {
              setRunStatus(`Master.py failed: ${status.error || `Exit code: ${status.returncode}`}`);
              setError(`Master.py execution failed: ${status.error || `Exit code: ${status.returncode}`}`);
              setRunning(false);
              setShowLogs(true); // Show logs on failure
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
        <div class={`status-message ${running() ? 'running' : masterLogs()?.status === 'failed' ? 'failed' : ''}`}>
          {runStatus()}
          <Show when={masterLogs()?.error}>
            <div class="error-details" style="margin-top: 8px; font-size: 0.9em; color: #ff4444;">
              {masterLogs()?.error}
            </div>
          </Show>
        </div>
      </Show>

      <Show when={masterLogs() && (showLogs() || running())}>
        <div class="master-logs-container" style="margin: 20px 0; padding: 15px; background: #1e1e1e; border-radius: 8px; max-height: 400px; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #fff;">Master.py Execution Logs</h3>
            <button 
              onClick={() => setShowLogs(!showLogs())}
              style="background: #333; color: #fff; border: 1px solid #555; padding: 5px 10px; border-radius: 4px; cursor: pointer;"
            >
              {showLogs() ? 'Hide' : 'Show'} Logs
            </button>
          </div>
          
          <Show when={showLogs()}>
            <div style="margin-bottom: 15px;">
              <div style="color: #888; font-size: 0.85em; margin-bottom: 5px;">
                Status: <strong style={`color: ${masterLogs()?.status === 'completed' ? '#4caf50' : masterLogs()?.status === 'failed' ? '#f44336' : '#ffa500'}`}>{masterLogs()?.status || 'unknown'}</strong>
                {masterLogs()?.returncode !== null && ` | Exit Code: ${masterLogs()?.returncode}`}
              </div>
              <Show when={masterLogs()?.start_time}>
                <div style="color: #888; font-size: 0.85em; margin-bottom: 5px;">
                  Started: {new Date(masterLogs()?.start_time || '').toLocaleString()}
                  {masterLogs()?.end_time && ` | Ended: ${new Date(masterLogs()?.end_time || '').toLocaleString()}`}
                </div>
              </Show>
            </div>
            
            <Show when={masterLogs()?.stdout}>
              <div style="margin-bottom: 15px;">
                <div style="color: #4caf50; font-weight: bold; margin-bottom: 5px;">STDOUT:</div>
                <pre style="background: #000; padding: 10px; border-radius: 4px; overflow-x: auto; color: #0f0; font-size: 0.85em; white-space: pre-wrap; word-wrap: break-word;">
                  {masterLogs()?.stdout || '(empty)'}
                </pre>
              </div>
            </Show>
            
            <Show when={masterLogs()?.stderr}>
              <div>
                <div style="color: #f44336; font-weight: bold; margin-bottom: 5px;">STDERR:</div>
                <pre style="background: #000; padding: 10px; border-radius: 4px; overflow-x: auto; color: #f44; font-size: 0.85em; white-space: pre-wrap; word-wrap: break-word;">
                  {masterLogs()?.stderr || '(empty)'}
                </pre>
              </div>
            </Show>
            
            <Show when={!masterLogs()?.stdout && !masterLogs()?.stderr}>
              <div style="color: #888; font-style: italic;">No logs available yet...</div>
            </Show>
          </Show>
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
                // win_probabilities uses 'home' and 'away' keys, not 'home_team' and 'away_team'
                const homeWinProb = gameInfo.winProbabilities?.home || gameInfo.winProbabilities?.home_team || 0;
                const awayWinProb = gameInfo.winProbabilities?.away || gameInfo.winProbabilities?.away_team || 0;
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
                        <Show when={gameInfo.gameId && gameResults().has(parseInt(gameInfo.gameId.toString()))}>
                          {(() => {
                            const result = gameResults().get(parseInt(gameInfo.gameId.toString()));
                            const finalScore = result?.final_game?.final_score;
                            const actualWinner = result?.final_game?.actual_winner;
                            const isAwayWinner = actualWinner === 'away';
                            const awayScore = finalScore?.away;
                            const homeScore = finalScore?.home;
                            return (
                              <span class={`result-badge ${isAwayWinner ? 'winner' : ''}`} style="margin-left: 10px; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; background: #333; color: #fff;">
                                {awayScore !== undefined && homeScore !== undefined ? `${awayScore}` : ''}
                                {isAwayWinner && ' ✓'}
                              </span>
                            );
                          })()}
                        </Show>
                      </div>
                      <div class="prob-row">
                        <span class="team-name">{gameInfo.homeTeam}</span>
                        <span class="probability">{(homeWinProb * 100).toFixed(1)}%</span>
                        <Show when={gameInfo.gameId && gameResults().has(parseInt(gameInfo.gameId.toString()))}>
                          {(() => {
                            const result = gameResults().get(parseInt(gameInfo.gameId.toString()));
                            const finalScore = result?.final_game?.final_score;
                            const actualWinner = result?.final_game?.actual_winner;
                            const isHomeWinner = actualWinner === 'home';
                            const awayScore = finalScore?.away;
                            const homeScore = finalScore?.home;
                            return (
                              <span class={`result-badge ${isHomeWinner ? 'winner' : ''}`} style="margin-left: 10px; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; background: #333; color: #fff;">
                                {awayScore !== undefined && homeScore !== undefined ? `${homeScore}` : ''}
                                {isHomeWinner && ' ✓'}
                              </span>
                            );
                          })()}
                        </Show>
                      </div>
                    </div>
                    
                    <Show when={gameInfo.gameId && gameResults().has(parseInt(gameInfo.gameId.toString()))}>
                      {(() => {
                        const result = gameResults().get(parseInt(gameInfo.gameId.toString()));
                        const finalScore = result?.final_game?.final_score;
                        const actualWinner = result?.final_game?.actual_winner;
                        const winnerName = actualWinner === 'away' ? gameInfo.awayTeam : actualWinner === 'home' ? gameInfo.homeTeam : null;
                        return (
                          <div class="game-result" style="margin-top: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px; border-left: 3px solid #4caf50;">
                            <strong style="color: #4caf50;">Winner: {winnerName}</strong>
                            {finalScore?.away !== undefined && finalScore?.home !== undefined && (
                              <span style="margin-left: 10px; color: #888;">
                                {gameInfo.awayTeam} {finalScore.away} - {finalScore.home} {gameInfo.homeTeam}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </Show>

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

                    <details 
                      class="full-data"
                      onToggle={(e) => {
                        const isOpen = e.currentTarget.open;
                        const fileKey = `${file.name}`;
                        
                        if (isOpen && !fullDataCache().has(fileKey) && !loadingFullData().has(fileKey)) {
                          // Fetch full data when expanded
                          setLoadingFullData(new Set([...loadingFullData(), fileKey]));
                          
                          const filePath = file.path || file.name;
                          const filename = filePath.split('/').pop() || filePath;
                          
                          data1Api.getGamePrediction(selectedDate(), filename)
                            .then((fullData) => {
                              const cache = new Map(fullDataCache());
                              cache.set(fileKey, fullData);
                              setFullDataCache(cache);
                              setLoadingFullData(new Set([...loadingFullData()].filter(k => k !== fileKey)));
                            })
                            .catch((err) => {
                              console.error('Error fetching full data:', err);
                              setLoadingFullData(new Set([...loadingFullData()].filter(k => k !== fileKey)));
                              // Fallback to showing metadata
                              const cache = new Map(fullDataCache());
                              cache.set(fileKey, file.data);
                              setFullDataCache(cache);
                            });
                        }
                      }}
                    >
                      <summary>View Full Data</summary>
                      <Show 
                        when={fullDataCache().has(file.name) || file.data}
                        fallback={
                          <div style="padding: 20px; text-align: center; color: #888;">
                            {loadingFullData().has(file.name) ? 'Loading full data...' : 'Click to load full data'}
                          </div>
                        }
                      >
                        <pre style="max-height: 500px; overflow: auto; background: #1e1e1e; padding: 15px; border-radius: 4px;">
                          {JSON.stringify(fullDataCache().get(file.name) || file.data, null, 2)}
                        </pre>
                      </Show>
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

