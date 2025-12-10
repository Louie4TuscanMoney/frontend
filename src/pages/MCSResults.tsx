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
    
    // Poll more frequently when running to show real-time progress
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    
    const startPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      
      const currentRunning = running();
      const pollDelay = currentRunning ? 2000 : 5000; // 2s when running, 5s when idle
      
      pollInterval = setInterval(() => {
        const currentRunningState = running();
        console.log(`[MCS_COMPONENT] [${new Date().toISOString()}] [COMPONENT_ID:${componentId}] Polling (running: ${currentRunningState})`);
        
        checkRunStatus();
        
        // Fetch logs more frequently when running (every 2 seconds)
        if (currentRunningState) {
          fetchMasterLogs();
        }
      }, pollDelay);
    };
    
    // Start initial polling
    startPolling();
    
    // Watch for running state changes to adjust polling frequency
    const runningCheckInterval = setInterval(() => {
      startPolling(); // Restart with new interval based on current state
    }, 3000) as unknown as number;
    
    console.log(`[MCS_COMPONENT] [${new Date().toISOString()}] [COMPONENT_ID:${componentId}] Status polling started (adaptive)`);
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(runningCheckInterval);
      console.log(`[MCS_COMPONENT] [${new Date().toISOString()}] [COMPONENT_ID:${componentId}] Component unmounted, intervals cleared`);
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
      
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ========== LOAD PREDICTIONS ERROR ==========`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Date: ${date}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Type: ${err.name || 'Unknown'}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Message: ${err.message || 'No message'}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Elapsed Time: ${elapsed.toFixed(0)}ms`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Full Error:`, err);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Stack Trace:`, err.stack);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Details:`, {
        name: err.name,
        message: err.message,
        stack: err.stack,
        cause: err.cause,
        code: err.code
      });
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ===========================================`);
      
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
      
      // Auto-expand logs when running or if there's an error
      if (logs.status === 'running' || logs.status === 'failed' || (logs.returncode !== null && logs.returncode !== 0)) {
        setShowLogs(true);
        
        // Log error details for debugging
        if (logs.status === 'failed' || logs.returncode !== 0) {
          console.error(`[MASTER_ERROR] [${new Date().toISOString()}] Master.py error detected:`, {
            status: logs.status,
            returncode: logs.returncode,
            error: logs.error,
            hasStdout: !!logs.stdout,
            hasStderr: !!logs.stderr,
            stdoutLength: logs.stdout?.length || 0,
            stderrLength: logs.stderr?.length || 0
          });
          
          // Extract and log error location
          if (logs.stderr) {
            const errorMatch = logs.stderr.match(/\[(\d+)\/(\d+)\]/);
            if (errorMatch) {
              console.error(`[MASTER_ERROR] [${new Date().toISOString()}] Failed at step ${errorMatch[1]}/${errorMatch[2]}`);
            }
            
            // Log last error lines
            const errorLines = logs.stderr.split('\n').filter(line => 
              line.includes('Error') || 
              line.includes('Exception') || 
              line.includes('Traceback') ||
              line.includes('Failed') ||
              line.includes('❌')
            );
            if (errorLines.length > 0) {
              console.error(`[MASTER_ERROR] [${new Date().toISOString()}] Error lines:`, errorLines.slice(-5));
            }
          }
        }
      }
    } catch (err: any) {
      const elapsed = performance.now() - startTime;
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ========== FETCH LOGS ERROR ==========`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Type: ${err.name || 'Unknown'}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Message: ${err.message || 'No message'}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Elapsed Time: ${elapsed.toFixed(0)}ms`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Full Error:`, err);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Stack Trace:`, err.stack);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ====================================`);
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
      
      const wasRunning = running();
      const wasStatus = masterLogs()?.status || 'idle';
      
      // Log full backend status for debugging
      console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Backend Status Response:`, {
        running: status.running,
        status: status.status,
        returncode: status.returncode,
        error: status.error,
        timestamp: status.timestamp || 'N/A',
        responseTime: `${statusElapsed.toFixed(0)}ms`,
        fullResponse: status
      });
      
      console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Frontend State Before Update:`, {
        running: wasRunning,
        status: wasStatus,
        hasLogs: !!masterLogs()
      });
      
      // Update state based on backend response - single source of truth
      setRunning(status.running);
      
      // Update run status message based on backend status
      if (status.running) {
        // Extract step info from logs if available
        const logs = masterLogs();
        let stepInfo = '';
        if (logs?.stdout) {
          const stepMatch = logs.stdout.match(/\[(\d+)\/(\d+)\]/);
          if (stepMatch) {
            const stepNum = parseInt(stepMatch[1]);
            const totalSteps = parseInt(stepMatch[2]);
            const stepNames = [
              'Scraping Daily Odds',
              'Scraping Injury Reports',
              'Scraping Advanced Box Scores',
              'Scraping Game Results',
              'Training Models',
              'Running MCS Predictions',
              'Running Extra Simulations',
              'Aggregating Results',
              'Comparing Predictions'
            ];
            const stepName = stepNames[stepNum] || `Step ${stepNum}`;
            stepInfo = ` - Step ${stepNum}/${totalSteps}: ${stepName}`;
          }
        }
        setRunStatus(`Master.py is running...${stepInfo}`);
        setError(null); // Clear error while running
        setShowLogs(true); // Auto-show logs when running
      } else if (status.status === 'completed') {
        setRunStatus(`Master.py completed successfully${status.returncode === 0 ? '' : ` (exit code: ${status.returncode})`}`);
        setRunning(false);
        setError(null);
      } else if (status.status === 'failed') {
        const errorMsg = status.error || `Exit code: ${status.returncode}`;
        setRunStatus(`Master.py failed: ${errorMsg}`);
        setError(`Master.py execution failed: ${errorMsg}`);
        setRunning(false);
        setShowLogs(true); // Show logs on failure
      } else if (status.status === 'idle') {
        setRunStatus('');
        setRunning(false);
        // Don't clear error if there was one - let user see it
      } else {
        // Unknown status - log it
        console.warn(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Unknown status: ${status.status}`);
        setRunStatus(`Status: ${status.status || 'unknown'}`);
      }
      
      // Log state changes
      if (wasRunning !== status.running) {
        console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ⚠️ RUNNING STATE CHANGED: ${wasRunning} -> ${status.running}`);
      }
      if (wasStatus !== status.status) {
        console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ⚠️ STATUS CHANGED: ${wasStatus} -> ${status.status}`);
      }
      
      // If it just finished, fetch logs
      if (wasRunning && !status.running) {
        console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Process finished, fetching final logs...`);
        await fetchMasterLogs();
      }
      
      // Always fetch logs if running to show progress (logs update every second on backend)
      if (status.running) {
        fetchMasterLogs();
      } else if (wasRunning && !status.running) {
        // Just finished - fetch final logs
        await fetchMasterLogs();
      }
      
      console.log(`[RUN_STATUS] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Frontend State After Update:`, {
        running: running(),
        status: masterLogs()?.status || 'no logs',
        runStatus: runStatus()
      });
      
    } catch (err: any) {
      const elapsed = performance.now() - startTime;
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ========== STATUS CHECK ERROR ==========`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Type: ${err.name || 'Unknown'}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Message: ${err.message || 'No message'}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Elapsed Time: ${elapsed.toFixed(0)}ms`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Full Error:`, err);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Stack Trace:`, err.stack);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ======================================`);
      
      // Don't change state on error - keep current state
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
      
      console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Trigger response:`, result);
      setRunStatus(result.message || 'Master.py started successfully');
      
      // Don't set running state here - let checkRunStatus() handle it based on backend response
      // This prevents race conditions
      setError(null); // Clear any previous errors
      
      // Immediately check status to get accurate state from backend
      await checkRunStatus();
      
      // Fetch logs immediately to show progress
      fetchMasterLogs();
      
      // Note: We don't need a separate polling interval here because checkRunStatus()
      // is already being called every 5 seconds by the main component interval.
      // This prevents multiple polling intervals from conflicting.
      
      // Refresh predictions after a delay (Master.py takes time)
      setTimeout(() => {
        console.log(`[MASTER_TRIGGER] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Auto-refreshing predictions after 30s`);
        loadPredictions(today);
      }, 30000); // Refresh after 30 seconds
    } catch (err: any) {
      const elapsed = performance.now() - startTime;
      
      // Comprehensive error logging
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ========== MASTER.PY TRIGGER ERROR ==========`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Type: ${err.name || 'Unknown'}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Message: ${err.message || 'No message'}`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Elapsed Time: ${elapsed.toFixed(0)}ms`);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Full Error Object:`, err);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Stack Trace:`, err.stack);
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] Error Details:`, {
        name: err.name,
        message: err.message,
        stack: err.stack,
        cause: err.cause,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall
      });
      console.error(`[ERROR] [${new Date().toISOString()}] [REQUEST_ID:${requestId}] ===========================================`);
      
      // Display user-friendly error message
      const errorMessage = err.message || 'Failed to trigger Master.py';
      setRunStatus(`Error: ${errorMessage}`);
      setError(`Failed to trigger Master.py: ${errorMessage}`);
      setRunning(false);
      setShowLogs(true); // Show logs on error
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
            {(() => {
              const isRunning = running();
              const status = masterLogs()?.status;
              if (isRunning) {
                return `⏳ Running... (${status || 'running'})`;
              } else if (status === 'failed') {
                return '🚀 Run Master.py (Previous run failed)';
              } else if (status === 'completed') {
                return '🚀 Run Master.py';
              } else {
                return '🚀 Run Master.py';
              }
            })()}
          </button>
        </div>
      </div>

      <Show when={runStatus() || running()}>
        <div class={`status-message ${running() ? 'running' : masterLogs()?.status === 'failed' ? 'failed' : ''}`}>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span>{running() ? '🔄' : masterLogs()?.status === 'failed' ? '❌' : masterLogs()?.status === 'completed' ? '✅' : 'ℹ️'}</span>
            <div>
              <div style="font-weight: bold;">{runStatus() || (running() ? 'Master.py is running...' : 'Status unknown')}</div>
              <Show when={masterLogs()}>
                <div style="font-size: 0.85em; color: #888; margin-top: 4px;">
                  Backend Status: {masterLogs()?.status || 'unknown'} | 
                  Running: {running() ? 'Yes' : 'No'} | 
                  {masterLogs()?.returncode !== null && `Exit Code: ${masterLogs()?.returncode}`}
                </div>
              </Show>
            </div>
          </div>
          <Show when={masterLogs()?.error}>
            <div class="error-details" style="margin-top: 8px; font-size: 0.9em; color: #ff4444;">
              {masterLogs()?.error}
            </div>
          </Show>
        </div>
      </Show>

      {/* Enhanced Error Display for Master.py Failures */}
      <Show when={masterLogs()?.status === 'failed' || (masterLogs()?.returncode !== null && masterLogs()?.returncode !== 0)}>
        <div style="margin: 20px 0; padding: 20px; background: #2d1f1f; border: 2px solid #f44336; border-radius: 8px;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 24px; margin-right: 10px;">❌</span>
            <h3 style="margin: 0; color: #f44336;">Master.py Execution Failed</h3>
          </div>
          
          <div style="margin-bottom: 15px;">
            <div style="color: #fff; font-weight: bold; margin-bottom: 5px;">Error Details:</div>
            <div style="color: #ff9999; font-family: monospace; background: #1a1a1a; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;">
              {(() => {
                const logs = masterLogs();
                if (!logs) return 'No error details available';
                
                // Extract error information
                const errorParts: string[] = [];
                
                if (logs.error) {
                  errorParts.push(`Error: ${logs.error}`);
                }
                
                if (logs.returncode !== null && logs.returncode !== 0) {
                  errorParts.push(`Exit Code: ${logs.returncode}`);
                }
                
                // Try to extract error location from stderr
                if (logs.stderr) {
                  const stderrLines = logs.stderr.split('\n');
                  
                  // Look for common error patterns
                  const errorLine = stderrLines.find(line => 
                    line.includes('Error') || 
                    line.includes('Exception') || 
                    line.includes('Traceback') ||
                    line.includes('Failed') ||
                    line.includes('❌')
                  );
                  
                  if (errorLine) {
                    errorParts.push(`\nError Location:\n${errorLine.trim()}`);
                  }
                  
                  // Look for step information (e.g., "[0/8]", "[1/8]", etc.)
                  const stepMatch = logs.stderr.match(/\[(\d+)\/(\d+)\]/);
                  if (stepMatch) {
                    const stepNum = parseInt(stepMatch[1]);
                    const totalSteps = parseInt(stepMatch[2]);
                    const stepNames = [
                      'Scraping Daily Odds',
                      'Scraping Injury Reports',
                      'Scraping Advanced Box Scores',
                      'Scraping Game Results',
                      'Training Models',
                      'Running MCS Predictions',
                      'Running Extra Simulations',
                      'Aggregating Results',
                      'Comparing Predictions'
                    ];
                    const stepName = stepNames[stepNum] || `Step ${stepNum}`;
                    errorParts.push(`\nFailed at: Step ${stepNum}/${totalSteps} - ${stepName}`);
                  }
                  
                  // Get last few lines of stderr for context
                  const lastErrorLines = stderrLines.slice(-10).join('\n');
                  if (lastErrorLines.trim()) {
                    errorParts.push(`\nLast Error Output:\n${lastErrorLines}`);
                  }
                }
                
                // Also check stdout for error messages
                if (logs.stdout) {
                  const stdoutLines = logs.stdout.split('\n');
                  const errorInStdout = stdoutLines.find(line => 
                    line.includes('❌') || 
                    line.includes('Error:') ||
                    line.includes('Failed')
                  );
                  
                  if (errorInStdout) {
                    errorParts.push(`\nError in Output:\n${errorInStdout.trim()}`);
                  }
                }
                
                return errorParts.length > 0 ? errorParts.join('\n') : 'No detailed error information available. Check logs below.';
              })()}
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <button 
              onClick={() => setShowLogs(!showLogs())}
              style="background: #f44336; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;"
            >
              {showLogs() ? '▼ Hide' : '▶ Show'} Full Logs
            </button>
          </div>
        </div>
      </Show>

      {/* Master.py Execution Logs - Always show when running or logs exist */}
      <Show when={running() || masterLogs()}>
        <div class="master-logs-container" style={`margin: 20px 0; padding: 20px; background: #1e1e1e; border-radius: 8px; border: 2px solid ${running() ? '#4caf50' : masterLogs()?.status === 'failed' ? '#f44336' : '#555'}`}>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <div>
              <h3 style="margin: 0; color: #fff; display: flex; align-items: center; gap: 10px;">
                {running() ? '🔄' : masterLogs()?.status === 'completed' ? '✅' : masterLogs()?.status === 'failed' ? '❌' : '📋'}
                Master.py Execution {running() ? 'In Progress' : 'Logs'}
              </h3>
              {(() => {
                const logs = masterLogs();
                if (!logs) return null;
                
                // Extract current step from stdout
                const stdout = logs.stdout || '';
                const stepMatch = stdout.match(/\[(\d+)\/(\d+)\]/);
                if (stepMatch) {
                  const stepNum = parseInt(stepMatch[1]);
                  const totalSteps = parseInt(stepMatch[2]);
                  const stepNames = [
                    'Scraping Daily Odds',
                    'Scraping Injury Reports',
                    'Scraping Advanced Box Scores',
                    'Scraping Game Results',
                    'Training Models',
                    'Running MCS Predictions',
                    'Running Extra Simulations',
                    'Aggregating Results',
                    'Comparing Predictions'
                  ];
                  const stepName = stepNames[stepNum] || `Step ${stepNum}`;
                  return (
                    <div style="color: #4caf50; font-size: 0.9em; margin-top: 5px;">
                      Current Step: <strong>{stepNum}/{totalSteps} - {stepName}</strong>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <button 
              onClick={() => setShowLogs(!showLogs())}
              style="background: #333; color: #fff; border: 1px solid #555; padding: 8px 16px; border-radius: 4px; cursor: pointer;"
            >
              {showLogs() ? '▼ Hide' : '▶ Show'} Full Logs
            </button>
          </div>
          
          {/* Status Summary */}
          <div style="margin-bottom: 15px; padding: 10px; background: #2a2a2a; border-radius: 4px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.9em;">
              <div>
                <span style="color: #888;">Status:</span>{' '}
                <strong style={`color: ${masterLogs()?.status === 'completed' ? '#4caf50' : masterLogs()?.status === 'failed' ? '#f44336' : running() ? '#ffa500' : '#888'}`}>
                  {masterLogs()?.status || (running() ? 'running' : 'idle')}
                </strong>
              </div>
              {masterLogs()?.returncode !== null && (
                <div>
                  <span style="color: #888;">Exit Code:</span>{' '}
                  <strong style={`color: ${masterLogs()?.returncode === 0 ? '#4caf50' : '#f44336'}`}>
                    {masterLogs()?.returncode}
                  </strong>
                </div>
              )}
              {masterLogs()?.start_time && (
                <div>
                  <span style="color: #888;">Started:</span>{' '}
                  <strong style="color: #fff;">{new Date(masterLogs()?.start_time || '').toLocaleTimeString()}</strong>
                </div>
              )}
              {masterLogs()?.end_time && (
                <div>
                  <span style="color: #888;">Ended:</span>{' '}
                  <strong style="color: #fff;">{new Date(masterLogs()?.end_time || '').toLocaleTimeString()}</strong>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          {(() => {
            const logs = masterLogs();
            if (!logs || !running()) return null;
            
            const stdout = logs.stdout || '';
            const stepMatch = stdout.match(/\[(\d+)\/(\d+)\]/);
            if (stepMatch) {
              const stepNum = parseInt(stepMatch[1]);
              const totalSteps = parseInt(stepMatch[2]);
              const progress = (stepNum / totalSteps) * 100;
              
              return (
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9em; color: #888;">
                    <span>Progress: Step {stepNum} of {totalSteps}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
                    <div 
                      style={`width: ${progress}%; height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.3s ease;`}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Live Output Preview (Last 20 lines when running) */}
          {running() && masterLogs()?.stdout && (
            <div style="margin-bottom: 15px;">
              <div style="color: #4caf50; font-weight: bold; margin-bottom: 5px; display: flex; align-items: center; gap: 5px;">
                <span style="animation: blink 1s infinite;">●</span> Live Output:
              </div>
              <pre 
                id="live-output"
                style="background: #000; padding: 10px; border-radius: 4px; overflow-x: auto; color: #0f0; font-size: 0.85em; white-space: pre-wrap; word-wrap: break-word; max-height: 200px; overflow-y: auto; font-family: 'Courier New', monospace;"
              >
                {(() => {
                  const stdout = masterLogs()?.stdout || '';
                  const lines = stdout.split('\n');
                  // Show last 20 lines when running
                  return lines.slice(-20).join('\n');
                })()}
              </pre>
            </div>
          )}
          
          {/* Full Logs (Expandable) */}
          <Show when={showLogs() || !running()}>
            <div>
              <Show when={masterLogs()?.stdout}>
                <div style="margin-bottom: 15px;">
                  <div style="color: #4caf50; font-weight: bold; margin-bottom: 5px;">Complete Output:</div>
                  <pre 
                    id="full-output"
                    style="background: #000; padding: 10px; border-radius: 4px; overflow-x: auto; color: #0f0; font-size: 0.85em; white-space: pre-wrap; word-wrap: break-word; max-height: 500px; overflow-y: auto; font-family: 'Courier New', monospace;"
                  >
                    {masterLogs()?.stdout || '(empty)'}
                  </pre>
                </div>
              </Show>
              
              <Show when={masterLogs()?.stderr}>
                <div>
                  <div style="color: #f44336; font-weight: bold; margin-bottom: 5px;">Errors:</div>
                  <pre style="background: #000; padding: 10px; border-radius: 4px; overflow-x: auto; color: #f44; font-size: 0.85em; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow-y: auto; font-family: 'Courier New', monospace;">
                    {masterLogs()?.stderr || '(empty)'}
                  </pre>
                </div>
              </Show>
              
              <Show when={!masterLogs()?.stdout && !masterLogs()?.stderr && !running()}>
                <div style="color: #888; font-style: italic; text-align: center; padding: 20px;">
                  No logs available yet. Click "Run Master.py" to start execution.
                </div>
              </Show>
            </div>
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

