import { useState } from 'react';

interface Props {
  apiBase: string;
  onBack: () => void;
  onCreated: () => void;
}

export function TariffForm({ apiBase, onBack, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [tariffId, setTariffId] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [type, setType] = useState('REGULAR');
  const [displayText, setDisplayText] = useState('');
  const [energyPrice, setEnergyPrice] = useState('0.35');
  const [parkingPrice, setParkingPrice] = useState('');
  const [chargingTimePrice, setChargingTimePrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tariffId.trim()) { setError('Tariff ID required'); return; }

    setLoading(true);
    setError('');

    const priceComponents: any[] = [];
    if (energyPrice) priceComponents.push({ type: 'ENERGY', price: parseFloat(energyPrice), step_size: 1 });
    if (parkingPrice) priceComponents.push({ type: 'PARKING_TIME', price: parseFloat(parkingPrice), step_size: 60 });
    if (chargingTimePrice) priceComponents.push({ type: 'CHARGING_TIME', price: parseFloat(chargingTimePrice), step_size: 60 });

    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/tariffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tariff_id: tariffId,
          currency, type,
          display_text: displayText || undefined,
          elements: [{ price_components: priceComponents }],
        }),
      });
      const data = await res.json();
      if (data.status_code === 1001) { onCreated(); onBack(); }
      else setError(data.status_message);
    } catch (err) { setError(`Error: ${err}`); }
    finally { setLoading(false); }
  };

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <div className="detail-title"><h2>Create Tariff</h2></div>
      </div>

      <div className="detail-content">
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-row">
            <div className="form-group">
              <label>Tariff ID *</label>
              <input value={tariffId} onChange={e => setTariffId(e.target.value)} placeholder="STANDARD-RATE" required />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}>
                <option>EUR</option><option>USD</option><option>GBP</option><option>CHF</option>
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="REGULAR">Regular</option>
                <option value="AD_HOC_OFFER">Ad-Hoc Offer</option>
                <option value="PROFILE_CHEAP">Profile Cheap</option>
                <option value="PROFILE_FAST">Profile Fast</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Display Text</label>
            <input value={displayText} onChange={e => setDisplayText(e.target.value)} placeholder="Standard charging rate" />
          </div>

          <h4>Price Components</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Energy (per kWh)</label>
              <input type="number" step="0.01" value={energyPrice} onChange={e => setEnergyPrice(e.target.value)} placeholder="0.35" />
            </div>
            <div className="form-group">
              <label>Parking (per hour)</label>
              <input type="number" step="0.01" value={parkingPrice} onChange={e => setParkingPrice(e.target.value)} placeholder="2.00" />
            </div>
            <div className="form-group">
              <label>Charging Time (per hour)</label>
              <input type="number" step="0.01" value={chargingTimePrice} onChange={e => setChargingTimePrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="button-row">
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Tariff'}</button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
