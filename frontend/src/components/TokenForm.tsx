import { useState } from 'react';

interface Props {
  apiBase: string;
  onBack: () => void;
  onCreated: () => void;
}

export function TokenForm({ apiBase, onBack, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [uid, setUid] = useState('');
  const [type, setType] = useState('RFID');
  const [authId, setAuthId] = useState('');
  const [issuer, setIssuer] = useState('VECS Test');
  const [visualNumber, setVisualNumber] = useState('');
  const [valid, setValid] = useState(true);
  const [whitelist, setWhitelist] = useState('ALWAYS');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid.trim() || !authId.trim() || !issuer.trim()) {
      setError('UID, Auth ID, and Issuer are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/tokens/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, auth_id: authId, issuer,
          visual_number: visualNumber || undefined,
          valid, whitelist,
        }),
      });
      const data = await res.json();
      if (data.status_code === 1000 || data.status_code === 1001) { onCreated(); onBack(); }
      else setError(data.status_message);
    } catch (err) { setError(`Error: ${err}`); }
    finally { setLoading(false); }
  };

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <div className="detail-title"><h2>Create Token</h2></div>
      </div>

      <div className="detail-content">
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-row">
            <div className="form-group">
              <label>Token UID *</label>
              <input value={uid} onChange={e => setUid(e.target.value)} placeholder="RFID-001" required />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="RFID">RFID</option>
                <option value="APP_USER">App User</option>
                <option value="AD_HOC_USER">Ad-hoc User</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Auth ID *</label>
              <input value={authId} onChange={e => setAuthId(e.target.value)} placeholder="AUTH-001" required />
            </div>
            <div className="form-group">
              <label>Issuer *</label>
              <input value={issuer} onChange={e => setIssuer(e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Visual Number</label>
              <input value={visualNumber} onChange={e => setVisualNumber(e.target.value)} placeholder="****1234" />
            </div>
            <div className="form-group">
              <label>Whitelist</label>
              <select value={whitelist} onChange={e => setWhitelist(e.target.value)}>
                <option value="ALWAYS">Always</option>
                <option value="ALLOWED">Allowed</option>
                <option value="ALLOWED_OFFLINE">Allowed Offline</option>
                <option value="NEVER">Never</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              <input type="checkbox" checked={valid} onChange={e => setValid(e.target.checked)} style={{ marginRight: '0.5rem' }} />
              Token is valid
            </label>
          </div>

          <div className="button-row">
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Token'}</button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
