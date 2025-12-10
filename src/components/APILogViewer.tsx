import { createSignal, For, Show } from 'solid-js';

export interface APILogEntry {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  responseTime?: number;
  error?: string;
  requestId?: string;
}

interface APILogViewerProps {
  logs: APILogEntry[];
  maxLogs?: number;
}

export default function APILogViewer(props: APILogViewerProps) {
  const [expanded, setExpanded] = createSignal(false);
  const [filter, setFilter] = createSignal<'all' | 'success' | 'error'>('all');

  const filteredLogs = () => {
    const logs = props.logs.slice(0, props.maxLogs || 50);
    if (filter() === 'all') return logs;
    if (filter() === 'success') return logs.filter(log => log.status && log.status < 400);
    return logs.filter(log => log.error || (log.status && log.status >= 400));
  };

  const getStatusColor = (status?: number, error?: string) => {
    if (error) return '#f44336';
    if (!status) return '#999';
    if (status < 300) return '#4caf50';
    if (status < 400) return '#2196f3';
    if (status < 500) return '#ff9800';
    return '#f44336';
  };

  const getStatusIcon = (status?: number, error?: string) => {
    if (error) return '❌';
    if (!status) return '⏳';
    if (status < 300) return '✅';
    if (status < 400) return 'ℹ️';
    if (status < 500) return '⚠️';
    return '❌';
  };

  return (
    <div style="
      background: #1e1e1e;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      max-height: ${expanded() ? '600px' : '300px'};
      overflow-y: auto;
      transition: max-height 0.3s ease;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; position: sticky; top: 0; background: #1e1e1e; padding-bottom: 10px; z-index: 10;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <h3 style="margin: 0; color: #fff; font-size: 1.1em;">📡 API Call Logs</h3>
          <div style="display: flex; gap: 5px;">
            <button
              onClick={() => setFilter('all')}
              style={`
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8em;
                background: ${filter() === 'all' ? '#4caf50' : '#333'};
                color: #fff;
              `}
            >
              All ({props.logs.length})
            </button>
            <button
              onClick={() => setFilter('success')}
              style={`
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8em;
                background: ${filter() === 'success' ? '#4caf50' : '#333'};
                color: #fff;
              `}
            >
              Success
            </button>
            <button
              onClick={() => setFilter('error')}
              style={`
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8em;
                background: ${filter() === 'error' ? '#f44336' : '#333'};
                color: #fff;
              `}
            >
              Errors
            </button>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded())}
          style="
            background: #333;
            color: #fff;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
          "
        >
          {expanded() ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>

      <Show when={filteredLogs().length === 0}>
        <div style="color: #888; text-align: center; padding: 20px;">
          No API calls logged yet
        </div>
      </Show>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <For each={filteredLogs()}>
          {(log) => (
            <div style="
              padding: 10px;
              background: #2a2a2a;
              border-radius: 4px;
              border-left: 3px solid ${getStatusColor(log.status, log.error)};
              font-family: monospace;
              font-size: 0.85em;
            ">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span>{getStatusIcon(log.status, log.error)}</span>
                  <span style="color: #fff; font-weight: 500;">
                    {log.method} {log.url.replace(/^https?:\/\//, '').split('/')[0]}
                  </span>
                  {log.status && (
                    <span style={`color: ${getStatusColor(log.status)};`}>
                      {log.status} {log.statusText}
                    </span>
                  )}
                  {log.responseTime && (
                    <span style="color: #888;">
                      ({log.responseTime}ms)
                    </span>
                  )}
                </div>
                <div style="color: #888; font-size: 0.8em;">
                  {log.timestamp.toLocaleTimeString()}
                </div>
              </div>
              {log.error && (
                <div style="color: #f44336; margin-top: 5px; padding-left: 20px;">
                  {log.error}
                </div>
              )}
              {log.requestId && (
                <div style="color: #666; font-size: 0.75em; margin-top: 3px; padding-left: 20px;">
                  Request ID: {log.requestId}
                </div>
              )}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

