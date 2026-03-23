import { useState } from 'react';

interface Props {
  apiBase: string;
  onCredentialsCreated: (token: string) => void;
}

export function CredentialsForm({ apiBase, onCredentialsCreated }: Props) {
  const [partyId, setPartyId] = useState('ABC');
  const [countryCode, setCountryCode] = useState('DE');
  const [businessName, setBusinessName] = useState('Test eMSP');
  const [website, setWebsite] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_id: partyId,
          country_code: countryCode,
          business_details: {
            name: businessName,
            website: website || undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.status_code === 1000) {
        setSuccess(`✓ Registered successfully! Token: ${data.data.token}`);
        onCredentialsCreated(data.data.token);
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
    <div className="card">
      <h2>📋 Register eMSP</h2>
      <p className="subtitle">Create credentials to access the OCPI CPO simulator</p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Party ID (3 chars)</label>
          <input
            type="text"
            maxLength={3}
            value={partyId}
            onChange={(e) => setPartyId(e.target.value.toUpperCase())}
            placeholder="ABC"
            required
          />
        </div>

        <div className="form-group">
          <label>Country Code (2 chars)</label>
          <input
            type="text"
            maxLength={2}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="DE"
            required
          />
        </div>

        <div className="form-group">
          <label>Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your eMSP Name"
            required
          />
        </div>

        <div className="form-group">
          <label>Website (optional)</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? '⏳ Registering...' : '✓ Register & Get Token'}
        </button>
      </form>

      <div className="info-box">
        <h4>What happens next?</h4>
        <ul>
          <li>You'll get a unique API token for this session</li>
          <li>Use it to access locations, EVSEs, and charging data</li>
          <li>Token expires in 1 year</li>
          <li>All API calls require: <code>Authorization: Token &lt;your_token&gt;</code></li>
        </ul>
      </div>
    </div>
  );
}
