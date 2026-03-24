import { useState } from 'react';

interface Token {
  uid: string;
  type: string;
  auth_id: string;
  visual_number?: string;
  issuer: string;
  valid: boolean;
  whitelist?: string;
  language?: string;
  last_updated: string;
}

interface Props {
  token: Token;
  apiBase: string;
  onBack: () => void;
  onUpdated: () => void;
}

export function TokenDetail({ token, apiBase, onBack, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');
  const [authResult, setAuthResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/tokens/${token.uid}/authorize`, { method: 'POST' });
      const data = await res.json();
      setAuthResult(data);
    } catch (err) {
      setAuthResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleValid = async () => {
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/tokens/${token.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valid: !token.valid }),
      });
      const data = await res.json();
      if (data.status_code === 1000) onUpdated();
    } catch (err) {
      console.error('Error toggling token:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this token?')) return;
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/tokens/${token.uid}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status_code === 1000) { onBack(); onUpdated(); }
      else alert(data.status_message || 'Failed to delete');
    } catch (err) { alert(`Error: ${err}`); }
  };

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <div className="detail-title">
          <h2>{token.uid}</h2>
          <span className={`status-badge ${token.valid ? 'status-available' : 'status-blocked'}`}>
            {token.valid ? 'Valid' : 'Blocked'}
          </span>
        </div>
        <div className="detail-actions">
          <button className={`btn ${token.valid ? 'btn-danger' : 'btn-primary'}`} onClick={handleToggleValid}>
            {token.valid ? 'Block' : 'Unblock'}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={`detail-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`detail-tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>Raw JSON</button>
      </div>

      {activeTab === 'overview' && (
        <div className="detail-content">
          {/* Authorization Test */}
          <div className="auth-test-card">
            <h3>Test Authorization</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={handleAuthorize} disabled={loading}>
                {loading ? 'Testing...' : 'Authorize'}
              </button>
              {authResult && (
                <div className={`auth-result ${authResult.data?.allowed === 'ALLOWED' ? 'success' : 'failed'}`}>
                  <strong>{authResult.data?.allowed || authResult.error || 'Unknown'}</strong>
                  {authResult.data?.authorization_reference && (
                    <span className="mono"> (ref: {authResult.data.authorization_reference})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="info-grid" style={{ marginTop: '1.5rem' }}>
            <div className="info-row"><span className="info-label">Type</span><span className="info-value"><span className="type-badge">{token.type}</span></span></div>
            <div className="info-row"><span className="info-label">Auth ID</span><span className="info-value">{token.auth_id}</span></div>
            <div className="info-row"><span className="info-label">Issuer</span><span className="info-value">{token.issuer}</span></div>
            <div className="info-row"><span className="info-label">Visual Number</span><span className="info-value">{token.visual_number || '—'}</span></div>
            <div className="info-row"><span className="info-label">Whitelist</span><span className="info-value">{token.whitelist || '—'}</span></div>
            <div className="info-row"><span className="info-label">Language</span><span className="info-value">{token.language || '—'}</span></div>
            <div className="info-row"><span className="info-label">Last Updated</span><span className="info-value mono">{token.last_updated}</span></div>
          </div>
        </div>
      )}

      {activeTab === 'json' && (
        <div className="detail-content">
          <div className="json-viewer">{JSON.stringify(token, null, 2)}</div>
        </div>
      )}
    </div>
  );
}
