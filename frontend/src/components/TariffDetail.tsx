import { useState } from 'react';

interface Tariff {
  id: string;
  currency: string;
  type: string;
  display_text?: string;
  elements: any[];
  last_updated: string;
}

interface Props {
  tariff: Tariff;
  apiBase: string;
  onBack: () => void;
  onUpdated: () => void;
}

export function TariffDetail({ tariff, apiBase, onBack, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [currency, setCurrency] = useState(tariff.currency);
  const [type, setType] = useState(tariff.type);
  const [displayText, setDisplayText] = useState(tariff.display_text || '');
  const [energyPrice, setEnergyPrice] = useState(() => {
    const e = tariff.elements?.[0]?.price_components?.find((p: any) => p.type === 'ENERGY');
    return e?.price?.toString() || '';
  });
  const [parkingPrice, setParkingPrice] = useState(() => {
    const p = tariff.elements?.[0]?.price_components?.find((p: any) => p.type === 'PARKING_TIME');
    return p?.price?.toString() || '';
  });
  const [chargingTimePrice, setChargingTimePrice] = useState(() => {
    const c = tariff.elements?.[0]?.price_components?.find((p: any) => p.type === 'CHARGING_TIME');
    return c?.price?.toString() || '';
  });

  const handleUpdate = async () => {
    setLoading(true);
    setError('');
    const priceComponents: any[] = [];
    if (energyPrice) priceComponents.push({ type: 'ENERGY', price: parseFloat(energyPrice), step_size: 1 });
    if (parkingPrice) priceComponents.push({ type: 'PARKING_TIME', price: parseFloat(parkingPrice), step_size: 60 });
    if (chargingTimePrice) priceComponents.push({ type: 'CHARGING_TIME', price: parseFloat(chargingTimePrice), step_size: 60 });

    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/tariffs/${tariff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency, type, display_text: displayText || undefined,
          elements: [{ price_components: priceComponents }],
        }),
      });
      const data = await res.json();
      if (data.status_code === 1000) { setEditing(false); onUpdated(); }
      else setError(data.status_message);
    } catch (err) { setError(`Error: ${err}`); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this tariff?')) return;
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/tariffs/${tariff.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status_code === 1000) { onBack(); onUpdated(); }
      else alert(data.status_message);
    } catch (err) { alert(`Error: ${err}`); }
  };

  const priceComponents = tariff.elements?.[0]?.price_components || [];

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <div className="detail-title">
          <h2>{tariff.id}</h2>
          <span className="detail-subtitle">{tariff.type}</span>
        </div>
        <div className="detail-actions">
          {!editing && (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="detail-tabs">
        <button className={`detail-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`detail-tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>Raw JSON</button>
      </div>

      {error && <div className="error">{error}</div>}

      {activeTab === 'overview' && (
        <div className="detail-content">
          {editing ? (
            <div className="edit-form">
              <div className="form-row">
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
                <input value={displayText} onChange={e => setDisplayText(e.target.value)} />
              </div>
              <h4>Price Components</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Energy (per kWh)</label>
                  <input type="number" step="0.01" value={energyPrice} onChange={e => setEnergyPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Parking (per hour)</label>
                  <input type="number" step="0.01" value={parkingPrice} onChange={e => setParkingPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Charging Time (per hour)</label>
                  <input type="number" step="0.01" value={chargingTimePrice} onChange={e => setChargingTimePrice(e.target.value)} />
                </div>
              </div>
              <div className="button-row">
                <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="info-grid">
                <div className="info-row"><span className="info-label">Currency</span><span className="info-value">{tariff.currency}</span></div>
                <div className="info-row"><span className="info-label">Type</span><span className="info-value">{tariff.type}</span></div>
                {tariff.display_text && <div className="info-row"><span className="info-label">Description</span><span className="info-value">{tariff.display_text}</span></div>}
                <div className="info-row"><span className="info-label">Last Updated</span><span className="info-value mono">{tariff.last_updated}</span></div>
              </div>
              
              <h3 style={{ marginTop: '1.5rem' }}>Price Components</h3>
              {priceComponents.length > 0 ? (
                <table className="data-table" style={{ marginTop: '0.5rem' }}>
                  <thead><tr><th>Type</th><th>Price</th><th>Step Size</th></tr></thead>
                  <tbody>
                    {priceComponents.map((pc: any, i: number) => (
                      <tr key={i}>
                        <td><span className="type-badge">{pc.type}</span></td>
                        <td className="mono">{tariff.currency} {pc.price}</td>
                        <td>{pc.step_size} {pc.type === 'ENERGY' ? 'Wh' : 'sec'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="empty-state">No price components</p>}
            </>
          )}
        </div>
      )}

      {activeTab === 'json' && (
        <div className="detail-content">
          <div className="json-viewer">{JSON.stringify(tariff, null, 2)}</div>
        </div>
      )}
    </div>
  );
}
