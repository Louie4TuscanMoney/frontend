import { createSignal, onMount, For } from 'solid-js';
import { DATA_API_URL, MCS_API_URL } from '../api/clients';

interface APIStatus {
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'checking' | 'error';
  lastCheck: Date | null;
  responseTime: number | null;
  error?: string;
}

export default function APIConnectionStatus() {
  const [apis, setApis] = createSignal<APIStatus[]>([
    {
      name: 'Data API (data1)',
      url: DATA_API_URL,
      status: 'checking',
      lastCheck: null,
      responseTime: null
    },
    {
      name: 'MCS API (mcs1)',
      url: MCS_API_URL,
      status: 'checking',
      lastCheck: null,
      responseTime: null
    }
  ]);

  const checkAPIStatus = async (api: APIStatus): Promise<APIStatus> => {
    const startTime = performance.now();
    try {
      // MCS API uses /api/health, Data API uses /health
      const healthEndpoint = api.name.includes('MCS') ? '/api/health' : '/health';
      const response = await fetch(`${api.url}${healthEndpoint}`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache'
      });
      const elapsed = performance.now() - startTime;
      
      if (response.ok) {
        return {
          ...api,
          status: 'connected',
          lastCheck: new Date(),
          responseTime: Math.round(elapsed),
          error: undefined
        };
      } else {
        return {
          ...api,
          status: 'error',
          lastCheck: new Date(),
          responseTime: Math.round(elapsed),
          error: `HTTP ${response.status}`
        };
      }
    } catch (error: any) {
      const elapsed = performance.now() - startTime;
      return {
        ...api,
        status: 'error',
        lastCheck: new Date(),
        responseTime: Math.round(elapsed),
        error: error.message || 'Connection failed'
      };
    }
  };

  const checkAllAPIs = async () => {
    const currentApis = apis();
    const updatedApis = await Promise.all(
      currentApis.map(api => checkAPIStatus(api))
    );
    setApis(updatedApis);
  };

  onMount(() => {
    checkAllAPIs();
    // Check every 30 seconds
    const interval = setInterval(checkAllAPIs, 30000);
    return () => clearInterval(interval);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#4caf50';
      case 'disconnected': return '#f44336';
      case 'checking': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '🟢';
      case 'disconnected': return '🔴';
      case 'checking': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div style="
      background: #1e1e1e;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0; color: #fff; font-size: 1.1em;">🌐 API Connection Status</h3>
        <button
          onClick={checkAllAPIs}
          style="
            background: #4caf50;
            color: #fff;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
          "
        >
          🔄 Refresh
        </button>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <For each={apis()}>
          {(api) => (
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px;
              background: #2a2a2a;
              border-radius: 4px;
              border-left: 3px solid ${getStatusColor(api.status)};
            ">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">{getStatusIcon(api.status)}</span>
                <div>
                  <div style="color: #fff; font-weight: 500;">{api.name}</div>
                  <div style="color: #888; font-size: 0.85em; font-family: monospace;">
                    {api.url.replace('https://', '').replace('http://', '')}
                  </div>
                </div>
              </div>
              <div style="text-align: right;">
                {api.status === 'connected' && api.responseTime !== null && (
                  <div style="color: #4caf50; font-size: 0.85em;">
                    {api.responseTime}ms
                  </div>
                )}
                {api.status === 'error' && api.error && (
                  <div style="color: #f44336; font-size: 0.85em;">
                    {api.error}
                  </div>
                )}
                {api.lastCheck && (
                  <div style="color: #888; font-size: 0.75em;">
                    {api.lastCheck.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

