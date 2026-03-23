import { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  direction: 'INBOUND' | 'OUTBOUND';
  method: string;
  path: string;
  query_params: any;
  request_headers: any;
  request_body: any;
  response_status: number;
  response_headers: any;
  response_body: any;
  duration_ms: number;
  emsp_token: string | null;
  error: string | null;
}

interface Props {
  apiBase: string;
}

export function LogViewer({ apiBase }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  // Filters
  const [pathFilter, setPathFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [limit, setLimit] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (pathFilter) params.set('path', pathFilter);
      if (methodFilter) params.set('method', methodFilter);

      const response = await fetch(`${apiBase}/admin/logs?${params}`);
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
  }, [pathFilter, methodFilter, limit]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, pathFilter, methodFilter, limit]);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return '#22c55e';
    if (status >= 400 && status < 500) return '#f59e0b';
    if (status >= 500) return '#ef4444';
    return '#6b7280';
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: '#22c55e',
      POST: '#3b82f6',
      PUT: '#f59e0b',
      PATCH: '#8b5cf6',
      DELETE: '#ef4444',
    };
    return colors[method] || '#6b7280';
  };

  const formatJson = (obj: any) => {
    if (!obj) return 'null';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <h2>📋 OCPI Request Logs</h2>
        <div className="log-controls">
          <input
            type="text"
            placeholder="Filter by path..."
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            className="filter-input"
          />
          <select 
            value={methodFilter} 
            onChange={(e) => setMethodFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select 
            value={limit} 
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="filter-select"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
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
        Showing {logs.length} of {total} logs
      </div>

      <div className="log-list">
        {logs.length === 0 && !loading && (
          <div className="empty-state">
            <p>📭 No logs yet</p>
            <p className="text-small">Make some OCPI requests to see them here</p>
          </div>
        )}

        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`log-entry ${expandedLog === log.id ? 'expanded' : ''}`}
          >
            <div 
              className="log-entry-header"
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            >
              <span 
                className="log-method"
                style={{ backgroundColor: getMethodColor(log.method) }}
              >
                {log.method}
              </span>
              <span className="log-path">/ocpi/2.2.1{log.path}</span>
              <span 
                className="log-status"
                style={{ color: getStatusColor(log.response_status) }}
              >
                {log.response_status}
              </span>
              <span className="log-duration">{log.duration_ms}ms</span>
              <span className="log-timestamp">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="log-expand-icon">
                {expandedLog === log.id ? '▼' : '▶'}
              </span>
            </div>

            {expandedLog === log.id && (
              <div className="log-entry-details">
                <div className="log-detail-row">
                  <strong>Timestamp:</strong> 
                  <span>{new Date(log.timestamp).toISOString()}</span>
                </div>
                
                {log.emsp_token && (
                  <div className="log-detail-row">
                    <strong>eMSP Token:</strong>
                    <code>{log.emsp_token}</code>
                  </div>
                )}

                <div className="log-section">
                  <h4>📤 Request Headers</h4>
                  <pre className="json-viewer">{formatJson(log.request_headers)}</pre>
                </div>

                {log.request_body && (
                  <div className="log-section">
                    <h4>📤 Request Body</h4>
                    <pre className="json-viewer">{formatJson(log.request_body)}</pre>
                  </div>
                )}

                <div className="log-section">
                  <h4>📥 Response Headers</h4>
                  <pre className="json-viewer">{formatJson(log.response_headers)}</pre>
                </div>

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
