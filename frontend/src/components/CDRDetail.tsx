import { useState } from 'react';

interface CDR {
  id: string;
  cdr_id: string;
  start_date_time: string;
  end_date_time: string;
  auth_id: string;
  auth_method?: string;
  location_id: string;
  evse_uid: string;
  connector_id?: string;
  total_cost: { excl_vat: number; incl_vat?: number };
  total_energy: number;
  total_time: number;
  total_parking_time?: number;
  currency?: string;
  charging_periods?: any[];
  tariffs?: any[];
  last_updated?: string;
}

interface Props {
  cdr: CDR;
  onBack: () => void;
}

export function CDRDetail({ cdr, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <div className="detail-title">
          <h2>{cdr.cdr_id}</h2>
          <span className="detail-subtitle">Charge Detail Record</span>
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
              <div className="stat-value">{cdr.total_energy.toFixed(2)}</div>
              <div className="stat-label">kWh</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Math.round(cdr.total_time / 60)}</div>
              <div className="stat-label">minutes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">€{cdr.total_cost.excl_vat.toFixed(2)}</div>
              <div className="stat-label">excl. VAT</div>
            </div>
            {cdr.total_cost.incl_vat && (
              <div className="stat-card">
                <div className="stat-value">€{cdr.total_cost.incl_vat.toFixed(2)}</div>
                <div className="stat-label">incl. VAT</div>
              </div>
            )}
          </div>

          <div className="info-grid">
            <div className="info-row"><span className="info-label">Start</span><span className="info-value mono">{new Date(cdr.start_date_time).toLocaleString()}</span></div>
            <div className="info-row"><span className="info-label">End</span><span className="info-value mono">{new Date(cdr.end_date_time).toLocaleString()}</span></div>
            <div className="info-row"><span className="info-label">Location</span><span className="info-value">{cdr.location_id}</span></div>
            <div className="info-row"><span className="info-label">EVSE</span><span className="info-value">{cdr.evse_uid}</span></div>
            {cdr.connector_id && <div className="info-row"><span className="info-label">Connector</span><span className="info-value">{cdr.connector_id}</span></div>}
            <div className="info-row"><span className="info-label">Auth ID</span><span className="info-value">{cdr.auth_id}</span></div>
            {cdr.auth_method && <div className="info-row"><span className="info-label">Auth Method</span><span className="info-value">{cdr.auth_method}</span></div>}
            {cdr.total_parking_time !== undefined && <div className="info-row"><span className="info-label">Parking Time</span><span className="info-value">{Math.round(cdr.total_parking_time / 60)} min</span></div>}
            {cdr.last_updated && <div className="info-row"><span className="info-label">Last Updated</span><span className="info-value mono">{cdr.last_updated}</span></div>}
          </div>

          {cdr.charging_periods && cdr.charging_periods.length > 0 && (
            <>
              <h3 style={{ marginTop: '1.5rem' }}>Charging Periods</h3>
              <table className="data-table">
                <thead><tr><th>Start</th><th>Dimensions</th></tr></thead>
                <tbody>
                  {cdr.charging_periods.map((period: any, i: number) => (
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
          <div className="json-viewer">{JSON.stringify(cdr, null, 2)}</div>
        </div>
      )}
    </div>
  );
}
