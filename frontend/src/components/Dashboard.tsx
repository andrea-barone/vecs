import { useState, useEffect } from 'react';

interface SystemStatus {
  locations: number;
  evses: number;
  connectors: number;
  emsps: number;
  sessions: number;
  cdrs: number;
  logs_24h: number;
  timestamp: string;
}

interface LogStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByMethod: Record<string, number>;
}

interface Props {
  apiBase: string;
}

export function Dashboard({ apiBase }: Props) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(''); // Clear previous errors
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch(`${apiBase}/admin/status`, { cache: 'no-store' }),
        fetch(`${apiBase}/admin/logs-stats?hours=24`, { cache: 'no-store' }),
      ]);

      if (!statusRes.ok || !statsRes.ok) {
        throw new Error(`API error: status=${statusRes.status}, logs-stats=${statsRes.status}`);
      }

      const statusData = await statusRes.json();
      const statsData = await statsRes.json();

      if (statusData.data) setStatus(statusData.data);
      if (statsData.data) setLogStats(statsData.data);
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return <div className="dashboard loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 System Dashboard</h2>
        <div className="dashboard-timestamp">
          Last updated: {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : '-'}
          <button onClick={fetchData} className="btn-small">🔄</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-value">{status?.locations || 0}</div>
          <div className="stat-label">Locations</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{status?.evses || 0}</div>
          <div className="stat-label">EVSEs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔌</div>
          <div className="stat-value">{status?.connectors || 0}</div>
          <div className="stat-label">Connectors</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-value">{status?.emsps || 0}</div>
          <div className="stat-label">eMSPs</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">🔄</div>
          <div className="stat-value">{status?.sessions || 0}</div>
          <div className="stat-label">Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-value">{status?.cdrs || 0}</div>
          <div className="stat-label">CDRs</div>
        </div>
      </div>

      {/* API Stats */}
      {logStats && (
        <div className="api-stats">
          <h3>📈 API Activity (Last 24h)</h3>
          <div className="api-stats-grid">
            <div className="api-stat">
              <div className="api-stat-value">{logStats.totalRequests}</div>
              <div className="api-stat-label">Total Requests</div>
            </div>
            <div className="api-stat success">
              <div className="api-stat-value">{logStats.successfulRequests}</div>
              <div className="api-stat-label">Successful</div>
            </div>
            <div className="api-stat danger">
              <div className="api-stat-value">{logStats.failedRequests}</div>
              <div className="api-stat-label">Failed</div>
            </div>
            <div className="api-stat">
              <div className="api-stat-value">{logStats.avgResponseTime}ms</div>
              <div className="api-stat-label">Avg Response Time</div>
            </div>
          </div>

          {/* Requests by Method */}
          <div className="breakdown-section">
            <h4>By Method</h4>
            <div className="breakdown-bars">
              {Object.entries(logStats.requestsByMethod).map(([method, count]) => (
                <div key={method} className="breakdown-bar">
                  <span className={`method-badge method-${method.toLowerCase()}`}>{method}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${Math.min(100, (count / logStats.totalRequests) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="breakdown-section">
            <h4>Top Endpoints</h4>
            <div className="endpoint-list">
              {Object.entries(logStats.requestsByEndpoint)
                .slice(0, 5)
                .map(([endpoint, count]) => (
                  <div key={endpoint} className="endpoint-item">
                    <code>/ocpi/2.2.1{endpoint}</code>
                    <span className="endpoint-count">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <a href={`${apiBase}/ocpi/2.2.1`} target="_blank" rel="noopener noreferrer" className="action-btn">
            📋 View OCPI Endpoints
          </a>
          <a href={`${apiBase}/admin/logs?limit=10`} target="_blank" rel="noopener noreferrer" className="action-btn">
            📊 View Raw Logs (JSON)
          </a>
          <a href={`${apiBase}/health`} target="_blank" rel="noopener noreferrer" className="action-btn">
            💚 Health Check
          </a>
        </div>
      </div>
    </div>
  );
}
