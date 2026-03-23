import { useState } from 'react';

interface Props {
  apiBase: string;
  locationId: string;
  onEVSECreated: () => void;
}

export function EVSEForm({ apiBase, locationId, onEVSECreated }: Props) {
  const [evseId, setEvseId] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/locations/${locationId}/evses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evse_id: evseId,
          status,
        }),
      });

      const data = await response.json();

      if (data.status_code === 1001) {
        setSuccess(`✓ EVSE created: ${evseId}`);
        setEvseId('');
        onEVSECreated();
      } else {
        setError(`Error: ${data.status_message}`);
      }
    } catch (err) {
      setError(`Connection error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form card">
      <div className="form-row">
        <div className="form-group">
          <label>EVSE ID *</label>
          <input
            type="text"
            value={evseId}
            onChange={(e) => setEvseId(e.target.value)}
            placeholder="EVSE-001"
            required
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>AVAILABLE</option>
            <option>BLOCKED</option>
            <option>CHARGING</option>
            <option>INOPERATIVE</option>
            <option>OUTOFSERVICE</option>
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <button type="submit" disabled={loading} className="btn btn-secondary">
        {loading ? '⏳ Creating...' : '⚡ Add EVSE'}
      </button>
    </form>
  );
}
