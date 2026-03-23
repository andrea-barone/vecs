import { useState, useEffect } from 'react';

interface EMSP {
  id: string;
  token: string;
  party_id: string;
  country_code: string;
  business_name: string;
  business_website?: string;
  version: string;
  expires_at: string;
  endpoints?: {
    locations?: string;
    sessions?: string;
    cdrs?: string;
    tokens?: string;
  };
  created_at: string;
}

interface Props {
  apiBase: string;
}

export function EMSPManager({ apiBase }: Props) {
  const [emsps, setEmsps] = useState<EMSP[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedEmsp, setExpandedEmsp] = useState<string | null>(null);
  
  // Edit endpoints form
  const [editingEmsp, setEditingEmsp] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState({
    locations: '',
    sessions: '',
    cdrs: '',
    tokens: '',
  });

  const fetchEmsps = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/admin/emsps`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setEmsps(data.data || []);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmsps();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this eMSP registration?')) return;
    
    try {
      const response = await fetch(`${apiBase}/admin/emsps/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        fetchEmsps();
      }
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const startEditEndpoints = (emsp: EMSP) => {
    setEditingEmsp(emsp.id);
    setEndpoints({
      locations: emsp.endpoints?.locations || '',
      sessions: emsp.endpoints?.sessions || '',
      cdrs: emsp.endpoints?.cdrs || '',
      tokens: emsp.endpoints?.tokens || '',
    });
  };

  const handleSaveEndpoints = async () => {
    if (!editingEmsp) return;
    
    try {
      const response = await fetch(`${apiBase}/admin/emsps/${editingEmsp}/endpoints`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoints }),
      });
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setEditingEmsp(null);
        fetchEmsps();
      }
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    alert('Token copied to clipboard!');
  };

  const formatJson = (obj: any) => JSON.stringify(obj, null, 2);

  return (
    <div className="emsp-manager">
      <div className="section-header">
        <h2>🏢 Registered eMSPs</h2>
        <button onClick={fetchEmsps} disabled={loading} className="btn-small">
          🔄 Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="emsp-list">
        {emsps.length === 0 && !loading && (
          <div className="empty-state">
            <p>📭 No eMSPs registered yet</p>
            <p className="text-small">eMSPs can register via POST /ocpi/2.2.1/credentials</p>
          </div>
        )}

        {emsps.map((emsp) => (
          <div key={emsp.id} className="emsp-card">
            <div
              className="emsp-header"
              onClick={() => setExpandedEmsp(expandedEmsp === emsp.id ? null : emsp.id)}
            >
              <span className="emsp-party">
                {emsp.country_code}-{emsp.party_id}
              </span>
              <span className="emsp-name">{emsp.business_name}</span>
              <span className="emsp-version">v{emsp.version}</span>
              <span className={`emsp-expires ${new Date(emsp.expires_at) < new Date() ? 'expired' : ''}`}>
                Expires: {new Date(emsp.expires_at).toLocaleDateString()}
              </span>
              <span className="expand-icon">{expandedEmsp === emsp.id ? '▼' : '▶'}</span>
            </div>

            {expandedEmsp === emsp.id && (
              <div className="emsp-details">
                <div className="emsp-token-section">
                  <strong>Token:</strong>
                  <code className="token-display">{emsp.token}</code>
                  <button 
                    className="btn-tiny" 
                    onClick={() => copyToken(emsp.token)}
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="detail-grid">
                  <div><strong>ID:</strong> {emsp.id}</div>
                  <div><strong>Created:</strong> {new Date(emsp.created_at).toLocaleString()}</div>
                  {emsp.business_website && (
                    <div><strong>Website:</strong> <a href={emsp.business_website} target="_blank" rel="noopener noreferrer">{emsp.business_website}</a></div>
                  )}
                </div>

                {/* Endpoints Section */}
                <div className="endpoints-section">
                  <h4>📡 Push Endpoints (for notifications)</h4>
                  
                  {editingEmsp === emsp.id ? (
                    <div className="endpoints-form">
                      <div className="form-group">
                        <label>Locations URL</label>
                        <input
                          type="text"
                          value={endpoints.locations}
                          onChange={(e) => setEndpoints({...endpoints, locations: e.target.value})}
                          placeholder="https://emsp.example.com/ocpi/cpo/locations"
                        />
                      </div>
                      <div className="form-group">
                        <label>Sessions URL</label>
                        <input
                          type="text"
                          value={endpoints.sessions}
                          onChange={(e) => setEndpoints({...endpoints, sessions: e.target.value})}
                          placeholder="https://emsp.example.com/ocpi/cpo/sessions"
                        />
                      </div>
                      <div className="form-group">
                        <label>CDRs URL</label>
                        <input
                          type="text"
                          value={endpoints.cdrs}
                          onChange={(e) => setEndpoints({...endpoints, cdrs: e.target.value})}
                          placeholder="https://emsp.example.com/ocpi/cpo/cdrs"
                        />
                      </div>
                      <div className="form-group">
                        <label>Tokens URL</label>
                        <input
                          type="text"
                          value={endpoints.tokens}
                          onChange={(e) => setEndpoints({...endpoints, tokens: e.target.value})}
                          placeholder="https://emsp.example.com/ocpi/cpo/tokens"
                        />
                      </div>
                      <div className="button-row">
                        <button className="btn-small btn-primary" onClick={handleSaveEndpoints}>
                          💾 Save
                        </button>
                        <button className="btn-small" onClick={() => setEditingEmsp(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {emsp.endpoints ? (
                        <div className="endpoints-list">
                          {Object.entries(emsp.endpoints).map(([key, url]) => (
                            url && (
                              <div key={key} className="endpoint-row">
                                <span className="endpoint-type">{key}</span>
                                <code>{url}</code>
                              </div>
                            )
                          ))}
                        </div>
                      ) : (
                        <p className="text-small">No endpoints configured</p>
                      )}
                      <button 
                        className="btn-small" 
                        onClick={() => startEditEndpoints(emsp)}
                      >
                        ✏️ Configure Endpoints
                      </button>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="emsp-actions">
                  <button 
                    className="btn-small btn-danger"
                    onClick={() => handleDelete(emsp.id)}
                  >
                    🗑️ Delete Registration
                  </button>
                </div>

                {/* Raw JSON */}
                <div className="json-section">
                  <h4>Raw JSON</h4>
                  <pre className="json-viewer">{formatJson(emsp)}</pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
