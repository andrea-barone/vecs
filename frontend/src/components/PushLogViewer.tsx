import { useState, useEffect } from 'react';

interface PushLog {
  id: string;
  emsp_id: string | null;
  endpoint_type: string;
  object_type: string | null;
  object_id: string | null;
  method: string;
  url: string;
  request_headers: any;
  request_body: any;
  response_status: number | null;
  response_body: any;
  success: boolean;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface Props {
  apiBase: string;
}

export function PushLogViewer({ apiBase }: Props) {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  // Filters
  const [endpointFilter, setEndpointFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');
  const [limit] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (endpointFilter) params.set('endpointType', endpointFilter);
      if (successFilter) params.set('success', successFilter);

      const response = await fetch(`${apiBase}/admin/push-logs?${params}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setLogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [endpointFilter, successFilter, limit]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, endpointFilter, successFilter, limit]);

  const formatJson = (obj: any) => {
    if (!obj) return 'null';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="push-log-viewer">
      <div className="log-viewer-header">
        <h3>📤 Outbound Push Notifications</h3>
        <div className="log-controls">
          <select 
            value={endpointFilter} 
            onChange={(e) => setEndpointFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="locations">Locations</option>
            <option value="sessions">Sessions</option>
            <option value="cdrs">CDRs</option>
            <option value="commands">Commands</option>
            <option value="simulation">Simulation</option>
          </select>
          <select 
            value={successFilter} 
            onChange={(e) => setSuccessFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
          <label className="auto-refresh-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button onClick={fetchLogs} disabled={loading} className="btn-small">
            {loading ? '🔄' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="log-stats">
        Showing {logs.length} of {total} push logs
      </div>

      <div className="log-list">
        {logs.length === 0 && !loading && (
          <div className="empty-state">
            <p>📭 No push logs yet</p>
            <p className="text-small">Push notifications to eMSPs will appear here</p>
          </div>
        )}

        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`log-entry ${expandedLog === log.id ? 'expanded' : ''} ${log.success ? '' : 'error-entry'}`}
          >
            <div 
              className="log-entry-header"
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            >
              <span 
                className={`push-status-badge ${log.success ? 'success' : 'failed'}`}
              >
                {log.success ? '✓' : '✕'}
              </span>
              <span className="push-type">{log.endpoint_type}</span>
              <span className="log-method">{log.method}</span>
              <span className="log-path">{log.url ? new URL(log.url).pathname : '-'}</span>
              {log.response_status && (
                <span className={`log-status ${log.response_status >= 200 && log.response_status < 300 ? 'success' : 'error'}`}>
                  {log.response_status}
                </span>
              )}
              {log.duration_ms && <span className="log-duration">{log.duration_ms}ms</span>}
              <span className="log-timestamp">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>
              <span className="log-expand-icon">
                {expandedLog === log.id ? '▼' : '▶'}
              </span>
            </div>

            {expandedLog === log.id && (
              <div className="log-entry-details">
                <div className="log-detail-row">
                  <strong>URL:</strong> 
                  <code>{log.url}</code>
                </div>
                <div className="log-detail-row">
                  <strong>Timestamp:</strong> 
                  <span>{new Date(log.created_at).toISOString()}</span>
                </div>
                {log.object_type && (
                  <div className="log-detail-row">
                    <strong>Object:</strong>
                    <span>{log.object_type} / {log.object_id}</span>
                  </div>
                )}

                {log.request_headers && (
                  <div className="log-section">
                    <h4>📤 Request Headers</h4>
                    <pre className="json-viewer">{formatJson(log.request_headers)}</pre>
                  </div>
                )}

                {log.request_body && (
                  <div className="log-section">
                    <h4>📤 Request Body</h4>
                    <pre className="json-viewer">{formatJson(log.request_body)}</pre>
                  </div>
                )}

                {log.response_body && (
                  <div className="log-section">
                    <h4>📥 Response Body</h4>
                    <pre className="json-viewer">{formatJson(log.response_body)}</pre>
                  </div>
                )}

                {log.error && (
                  <div className="log-section error-section">
                    <h4>❌ Error</h4>
                    <pre>{log.error}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
