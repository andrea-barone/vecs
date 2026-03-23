import { useState } from 'react';

interface Props {
  apiBase: string;
  onLocationCreated: () => void;
}

export function LocationForm({ apiBase, onLocationCreated }: Props) {
  const [locationId, setLocationId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('DE');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          address,
          city,
          postal_code: postalCode,
          country,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          operator_name: operatorName || undefined,
        }),
      });

      const data = await response.json();

      if (data.status_code === 1001) {
        setSuccess(`✓ Location created: ${locationId}`);
        setLocationId('');
        setAddress('');
        setCity('');
        setPostalCode('');
        setLatitude('');
        setLongitude('');
        setOperatorName('');
        onLocationCreated();
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
          <label>Location ID *</label>
          <input
            type="text"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="LOC-001"
            required
          />
        </div>

        <div className="form-group">
          <label>Country *</label>
          <input
            type="text"
            maxLength={2}
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Address *</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Main Street 123"
            required
          />
        </div>

        <div className="form-group">
          <label>City *</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Berlin"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Postal Code *</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="10115"
            required
          />
        </div>

        <div className="form-group">
          <label>Operator Name</label>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="City Chargers"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Latitude *</label>
          <input
            type="number"
            step="0.0001"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="52.5200"
            required
          />
        </div>

        <div className="form-group">
          <label>Longitude *</label>
          <input
            type="number"
            step="0.0001"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="13.4050"
            required
          />
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? '⏳ Creating...' : '✓ Create Location'}
      </button>
    </form>
  );
}
