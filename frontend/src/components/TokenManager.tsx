import { useState, useEffect } from 'react';

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
  apiBase: string;
}

export function TokenManager({ apiBase }: Props) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  
  // New token form
  const [showForm, setShowForm] = useState(false);
  const [formUid, setFormUid] = useState('');
  const [formType, setFormType] = useState('RFID');
  const [formAuthId, setFormAuthId] = useState('');
  const [formIssuer, setFormIssuer] = useState('VECS Test');
  const [formVisualNumber, setFormVisualNumber] = useState('');
  const [formValid, setFormValid] = useState(true);
  const [formWhitelist, setFormWhitelist] = useState('ALWAYS');
  const [formLoading, setFormLoading] = useState(false);

  // Authorization test
  const [authTestUid, setAuthTestUid] = useState('');
  const [authResult, setAuthResult] = useState<any>(null);

  const fetchTokens = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/tokens`);
      const data = await response.json();
      if (data.status_code === 1000) {
        setTokens(data.data || []);
      } else {
        setError(data.status_message);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreateSamples = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/tokens/samples`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.status_code === 1001) {
        fetchTokens();
      } else {
        setError(data.status_message);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!formUid || !formAuthId || !formIssuer) {
      setError('Please fill all required fields');
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/tokens/${formUid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          auth_id: formAuthId,
          issuer: formIssuer,
          visual_number: formVisualNumber || undefined,
          valid: formValid,
          whitelist: formWhitelist,
        }),
      });

      const data = await response.json();
      if (data.status_code === 1000 || data.status_code === 1001) {
        setShowForm(false);
        resetForm();
        fetchTokens();
      } else {
        setError(data.status_message);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleValid = async (token: Token) => {
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/tokens/${token.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valid: !token.valid }),
      });

      const data = await response.json();
      if (data.status_code === 1000) {
        fetchTokens();
      }
    } catch (err) {
      console.error('Error toggling token:', err);
    }
  };

  const handleAuthorize = async () => {
    if (!authTestUid) return;

    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/tokens/${authTestUid}/authorize`, {
        method: 'POST',
      });
      const data = await response.json();
      setAuthResult(data);
    } catch (err) {
      setAuthResult({ error: String(err) });
    }
  };

  const resetForm = () => {
    setFormUid('');
    setFormType('RFID');
    setFormAuthId('');
    setFormIssuer('VECS Test');
    setFormVisualNumber('');
    setFormValid(true);
    setFormWhitelist('ALWAYS');
  };

  const formatJson = (obj: any) => JSON.stringify(obj, null, 2);

  return (
    <div className="token-manager">
      <div className="section-header">
        <h2>🔑 Token Management</h2>
        <div className="header-actions">
          <button onClick={handleCreateSamples} disabled={loading} className="btn-small">
            🎲 Create Samples
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-small btn-primary">
            {showForm ? '✕ Cancel' : '+ New Token'}
          </button>
          <button onClick={fetchTokens} disabled={loading} className="btn-small">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Authorization Test */}
      <div className="auth-test-panel">
        <h3>🔐 Test Authorization</h3>
        <div className="auth-test-form">
          <input
            type="text"
            placeholder="Enter Token UID (e.g., RFID-001)"
            value={authTestUid}
            onChange={(e) => setAuthTestUid(e.target.value)}
          />
          <button onClick={handleAuthorize} className="btn-small btn-primary">
            Test Authorize
          </button>
        </div>
        {authResult && (
          <div className={`auth-result ${authResult.data?.allowed === 'ALLOWED' ? 'success' : 'failed'}`}>
            <strong>Result:</strong> {authResult.data?.allowed || authResult.error || 'Unknown'}
            {authResult.data?.authorization_reference && (
              <div><strong>Auth Reference:</strong> {authResult.data.authorization_reference}</div>
            )}
          </div>
        )}
      </div>

      {/* New Token Form */}
      {showForm && (
        <div className="token-form">
          <h3>Create New Token</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Token UID *</label>
              <input
                type="text"
                value={formUid}
                onChange={(e) => setFormUid(e.target.value)}
                placeholder="e.g., RFID-123"
              />
            </div>
            <div className="form-group">
              <label>Type *</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                <option value="RFID">RFID</option>
                <option value="APP_USER">App User</option>
                <option value="AD_HOC_USER">Ad-hoc User</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Auth ID *</label>
              <input
                type="text"
                value={formAuthId}
                onChange={(e) => setFormAuthId(e.target.value)}
                placeholder="e.g., AUTH-123"
              />
            </div>
            <div className="form-group">
              <label>Issuer *</label>
              <input
                type="text"
                value={formIssuer}
                onChange={(e) => setFormIssuer(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Visual Number</label>
              <input
                type="text"
                value={formVisualNumber}
                onChange={(e) => setFormVisualNumber(e.target.value)}
                placeholder="e.g., ****1234"
              />
            </div>
            <div className="form-group">
              <label>Whitelist</label>
              <select value={formWhitelist} onChange={(e) => setFormWhitelist(e.target.value)}>
                <option value="ALWAYS">Always</option>
                <option value="ALLOWED">Allowed</option>
                <option value="ALLOWED_OFFLINE">Allowed Offline</option>
                <option value="NEVER">Never</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formValid}
                  onChange={(e) => setFormValid(e.target.checked)}
                /> Valid
              </label>
            </div>
          </div>
          <button onClick={handleCreateToken} disabled={formLoading} className="btn btn-primary">
            {formLoading ? '⏳ Creating...' : 'Create Token'}
          </button>
        </div>
      )}

      {/* Token List */}
      <div className="token-list">
        {tokens.length === 0 && !loading && (
          <div className="empty-state">
            <p>📭 No tokens yet</p>
            <p className="text-small">Create some sample tokens to get started</p>
          </div>
        )}

        {tokens.map((token) => (
          <div key={token.uid} className={`token-card ${token.valid ? '' : 'invalid'}`}>
            <div
              className="token-header"
              onClick={() => setExpandedToken(expandedToken === token.uid ? null : token.uid)}
            >
              <span className="token-type-badge">{token.type}</span>
              <span className="token-uid">{token.uid}</span>
              <span className={`token-valid-badge ${token.valid ? 'valid' : 'blocked'}`}>
                {token.valid ? '✓ Valid' : '✕ Blocked'}
              </span>
              <span className="token-issuer">{token.issuer}</span>
              <span className="expand-icon">{expandedToken === token.uid ? '▼' : '▶'}</span>
            </div>

            {expandedToken === token.uid && (
              <div className="token-details">
                <div className="detail-grid">
                  <div><strong>Auth ID:</strong> {token.auth_id}</div>
                  <div><strong>Visual Number:</strong> {token.visual_number || '-'}</div>
                  <div><strong>Whitelist:</strong> {token.whitelist || '-'}</div>
                  <div><strong>Language:</strong> {token.language || '-'}</div>
                  <div><strong>Last Updated:</strong> {new Date(token.last_updated).toLocaleString()}</div>
                </div>
                
                <div className="token-actions">
                  <button
                    className={`btn-small ${token.valid ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => handleToggleValid(token)}
                  >
                    {token.valid ? '🚫 Block Token' : '✓ Unblock Token'}
                  </button>
                </div>

                <div className="json-section">
                  <h4>Raw JSON</h4>
                  <pre className="json-viewer">{formatJson(token)}</pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
