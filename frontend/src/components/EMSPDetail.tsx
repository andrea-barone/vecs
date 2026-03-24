import { useState } from 'react';

interface EMSP {
  id: string;
  token: string;
  party_id: string;
  country_code: string;
  business_name: string;
  business_website?: string;
  version: string;
  expires_at: string;
  endpoints?: Record<string, string>;
  created_at: string;
}

interface Props {
  emsp: EMSP;
  apiBase: string;
  onBack: () => void;
  onUpdated: () => void;
}

export function EMSPDetail({ emsp, apiBase, onBack, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'json'>('overview');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [endpoints, setEndpoints] = useState({
    locations: emsp.endpoints?.locations || '',
    sessions: emsp.endpoints?.sessions || '',
    cdrs: emsp.endpoints?.cdrs || '',
    tokens: emsp.endpoints?.tokens || '',
  });

  const handleSaveEndpoints = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/admin/emsps/${emsp.id}/endpoints`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoints }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setEditing(false); onUpdated(); }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this eMSP registration?')) return;
    try {
      const res = await fetch(`${apiBase}/admin/emsps/${emsp.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { onBack(); onUpdated(); }
    } catch (err) { alert(`Error: ${err}`); }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(emsp.token);
    alert('Token copied!');
  };

  const isExpired = new Date(emsp.expires_at) < new Date();

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <div className="detail-title">
          <h2>{emsp.country_code}-{emsp.party_id}</h2>
          <span className="detail-subtitle">{emsp.business_name}</span>
        </div>
        <div className="detail-actions">
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={`detail-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`detail-tab ${activeTab === 'endpoints' ? 'active' : ''}`} onClick={() => setActiveTab('endpoints')}>Endpoints</button>
        <button className={`detail-tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>Raw JSON</button>
      </div>

      {error && <div className="error">{error}</div>}

      {activeTab === 'overview' && (
        <div className="detail-content">
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value">
                <span className={`status-badge ${isExpired ? 'status-blocked' : 'status-available'}`}>
                  {isExpired ? 'Expired' : 'Active'}
                </span>
              </span>
            </div>
            <div className="info-row"><span className="info-label">ID</span><span className="info-value mono">{emsp.id}</span></div>
            <div className="info-row"><span className="info-label">Version</span><span className="info-value">v{emsp.version}</span></div>
            <div className="info-row"><span className="info-label">Created</span><span className="info-value mono">{new Date(emsp.created_at).toLocaleString()}</span></div>
            <div className="info-row"><span className="info-label">Expires</span><span className="info-value mono">{new Date(emsp.expires_at).toLocaleString()}</span></div>
            {emsp.business_website && (
              <div className="info-row">
                <span className="info-label">Website</span>
                <span className="info-value"><a href={emsp.business_website} target="_blank" rel="noopener">{emsp.business_website}</a></span>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3>Access Token</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
              <code className="token-display" style={{ flex: 1, padding: '0.5rem', background: 'var(--color-bg-secondary)', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all' }}>
                {emsp.token}
              </code>
              <button className="btn btn-secondary" onClick={copyToken}>Copy</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'endpoints' && (
        <div className="detail-content">
          <div className="section-header">
            <h3>Push Endpoints</h3>
            {!editing && <button className="btn btn-secondary" onClick={() => setEditing(true)}>Configure</button>}
          </div>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>URLs where VECS will push updates to this eMSP</p>

          {editing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>Locations URL</label>
                <input value={endpoints.locations} onChange={e => setEndpoints({...endpoints, locations: e.target.value})} placeholder="https://emsp.example.com/ocpi/cpo/locations" />
              </div>
              <div className="form-group">
                <label>Sessions URL</label>
                <input value={endpoints.sessions} onChange={e => setEndpoints({...endpoints, sessions: e.target.value})} placeholder="https://emsp.example.com/ocpi/cpo/sessions" />
              </div>
              <div className="form-group">
                <label>CDRs URL</label>
                <input value={endpoints.cdrs} onChange={e => setEndpoints({...endpoints, cdrs: e.target.value})} placeholder="https://emsp.example.com/ocpi/cpo/cdrs" />
              </div>
              <div className="form-group">
                <label>Tokens URL</label>
                <input value={endpoints.tokens} onChange={e => setEndpoints({...endpoints, tokens: e.target.value})} placeholder="https://emsp.example.com/ocpi/cpo/tokens" />
              </div>
              <div className="button-row">
                <button className="btn btn-primary" onClick={handleSaveEndpoints} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Module</th><th>URL</th></tr></thead>
              <tbody>
                {['locations', 'sessions', 'cdrs', 'tokens'].map(key => (
                  <tr key={key}>
                    <td className="mono">{key}</td>
                    <td className="mono truncate">{emsp.endpoints?.[key] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'json' && (
        <div className="detail-content">
          <div className="json-viewer">{JSON.stringify(emsp, null, 2)}</div>
        </div>
      )}
    </div>
  );
}
