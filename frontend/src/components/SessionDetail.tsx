import { useState } from 'react';

interface Session {
  id: string;
  session_id: string;
  start_date_time: string;
  end_date_time?: string;
  kwh: number;
  auth_id: string;
  auth_method: string;
  location_id: string;
  evse_uid: string;
  connector_id: string;
  currency: string;
  charging_periods: any[];
  total_cost?: number;
  status: string;
  last_updated: string;
}

interface Props {
  session: Session;
  onBack: () => void;
}

export function SessionDetail({ session, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');

  const duration = session.end_date_time 
    ? Math.round((new Date(session.end_date_time).getTime() - new Date(session.start_date_time).getTime()) / 60000)
    : Math.round((Date.now() - new Date(session.start_date_time).getTime()) / 60000);

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <div className="detail-title">
          <h2>{session.session_id}</h2>
          <span className={`status-badge status-${session.status.toLowerCase()}`}>{session.status}</span>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={`detail-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`detail-tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>Raw JSON</button>
      </div>

      {activeTab === 'overview' && (
        <div className="detail-content">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{session.kwh.toFixed(2)}</div>
              <div className="stat-label">kWh</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{duration}</div>
              <div className="stat-label">minutes</div>
            </div>
            {session.total_cost !== undefined && (
              <div className="stat-card">
                <div className="stat-value">{session.currency} {session.total_cost.toFixed(2)}</div>
                <div className="stat-label">cost</div>
              </div>
            )}
          </div>

          <div className="info-grid">
            <div className="info-row"><span className="info-label">Started</span><span className="info-value mono">{new Date(session.start_date_time).toLocaleString()}</span></div>
            <div className="info-row"><span className="info-label">Ended</span><span className="info-value mono">{session.end_date_time ? new Date(session.end_date_time).toLocaleString() : '—'}</span></div>
            <div className="info-row"><span className="info-label">Location</span><span className="info-value">{session.location_id}</span></div>
            <div className="info-row"><span className="info-label">EVSE</span><span className="info-value">{session.evse_uid}</span></div>
            <div className="info-row"><span className="info-label">Connector</span><span className="info-value">{session.connector_id}</span></div>
            <div className="info-row"><span className="info-label">Auth ID</span><span className="info-value">{session.auth_id}</span></div>
            <div className="info-row"><span className="info-label">Auth Method</span><span className="info-value">{session.auth_method}</span></div>
            <div className="info-row"><span className="info-label">Last Updated</span><span className="info-value mono">{session.last_updated}</span></div>
          </div>

          {session.charging_periods?.length > 0 && (
            <>
              <h3 style={{ marginTop: '1.5rem' }}>Charging Periods</h3>
              <table className="data-table">
                <thead><tr><th>Start</th><th>Dimensions</th></tr></thead>
                <tbody>
                  {session.charging_periods.map((period: any, i: number) => (
                    <tr key={i}>
                      <td className="mono">{new Date(period.start_date_time).toLocaleString()}</td>
                      <td>{period.dimensions?.map((d: any) => `${d.type}: ${d.volume}`).join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {activeTab === 'json' && (
        <div className="detail-content">
          <div className="json-viewer">{JSON.stringify(session, null, 2)}</div>
        </div>
      )}
    </div>
  );
}
