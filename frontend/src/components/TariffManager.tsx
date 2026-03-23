import { useState, useEffect } from 'react';

interface Tariff {
  id: string;
  currency: string;
  type: string;
  display_text?: string;
  min_price?: number;
  max_price?: number;
  elements: any[];
  last_updated: string;
}

interface Props {
  apiBase: string;
}

export function TariffManager({ apiBase }: Props) {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [tariffId, setTariffId] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [type, setType] = useState('REGULAR');
  const [displayText, setDisplayText] = useState('');
  const [energyPrice, setEnergyPrice] = useState('0.35');
  const [parkingPrice, setParkingPrice] = useState('');
  const [chargingTimePrice, setChargingTimePrice] = useState('');

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/tariffs`);
      const data = await response.json();
      if (data.status_code === 1000) {
        setTariffs(data.data || []);
      }
    } catch (err) {
      setError(`Error fetching tariffs: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const buildElements = () => {
    const priceComponents: any[] = [];
    
    if (energyPrice) {
      priceComponents.push({ type: 'ENERGY', price: parseFloat(energyPrice), step_size: 1 });
    }
    if (parkingPrice) {
      priceComponents.push({ type: 'PARKING_TIME', price: parseFloat(parkingPrice), step_size: 60 });
    }
    if (chargingTimePrice) {
      priceComponents.push({ type: 'CHARGING_TIME', price: parseFloat(chargingTimePrice), step_size: 60 });
    }

    return [{ price_components: priceComponents }];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const elements = buildElements();
    const body = {
      tariff_id: tariffId,
      currency,
      type,
      display_text: displayText || undefined,
      elements,
    };

    try {
      const url = editingTariff 
        ? `${apiBase}/ocpi/2.2.1/tariffs/${editingTariff.id}`
        : `${apiBase}/ocpi/2.2.1/tariffs`;
      
      const response = await fetch(url, {
        method: editingTariff ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.status_code === 1000 || data.status_code === 1001) {
        setSuccess(editingTariff ? 'Tariff updated!' : 'Tariff created!');
        resetForm();
        fetchTariffs();
      } else {
        setError(data.status_message);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tariffId: string) => {
    if (!confirm('Delete this tariff?')) return;
    
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/tariffs/${tariffId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status_code === 1000) {
        fetchTariffs();
      } else {
        setError(data.status_message);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const handleEdit = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setTariffId(tariff.id);
    setCurrency(tariff.currency);
    setType(tariff.type);
    setDisplayText(tariff.display_text || '');
    
    // Parse elements
    const element = tariff.elements?.[0];
    if (element?.price_components) {
      const energy = element.price_components.find((p: any) => p.type === 'ENERGY');
      const parking = element.price_components.find((p: any) => p.type === 'PARKING_TIME');
      const charging = element.price_components.find((p: any) => p.type === 'CHARGING_TIME');
      
      setEnergyPrice(energy?.price?.toString() || '');
      setParkingPrice(parking?.price?.toString() || '');
      setChargingTimePrice(charging?.price?.toString() || '');
    }
    
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTariff(null);
    setTariffId('');
    setCurrency('EUR');
    setType('REGULAR');
    setDisplayText('');
    setEnergyPrice('0.35');
    setParkingPrice('');
    setChargingTimePrice('');
  };

  return (
    <div className="tariff-manager">
      <div className="section-header">
        <h2>💰 Tariffs</h2>
        <button 
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
        >
          {showForm ? '✕ Cancel' : '+ New Tariff'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="tariff-form card">
          <h3>{editingTariff ? 'Edit Tariff' : 'Create Tariff'}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Tariff ID *</label>
              <input
                type="text"
                value={tariffId}
                onChange={(e) => setTariffId(e.target.value)}
                placeholder="STANDARD-RATE"
                required
                disabled={!!editingTariff}
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
                <option>CHF</option>
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="REGULAR">Regular</option>
                <option value="AD_HOC_OFFER">Ad-Hoc Offer</option>
                <option value="PROFILE_CHEAP">Profile Cheap</option>
                <option value="PROFILE_FAST">Profile Fast</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Display Text</label>
            <input
              type="text"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder="Standard charging rate"
            />
          </div>

          <h4>Price Components</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Energy (per kWh)</label>
              <input
                type="number"
                step="0.01"
                value={energyPrice}
                onChange={(e) => setEnergyPrice(e.target.value)}
                placeholder="0.35"
              />
            </div>
            <div className="form-group">
              <label>Parking (per hour)</label>
              <input
                type="number"
                step="0.01"
                value={parkingPrice}
                onChange={(e) => setParkingPrice(e.target.value)}
                placeholder="2.00"
              />
            </div>
            <div className="form-group">
              <label>Charging Time (per hour)</label>
              <input
                type="number"
                step="0.01"
                value={chargingTimePrice}
                onChange={(e) => setChargingTimePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '...' : editingTariff ? 'Update Tariff' : 'Create Tariff'}
          </button>
        </form>
      )}

      {loading && !showForm && <p>Loading...</p>}

      <div className="tariff-list">
        {tariffs.length === 0 ? (
          <p className="empty-state">No tariffs yet. Create one above!</p>
        ) : (
          tariffs.map((tariff) => (
            <div key={tariff.id} className="tariff-card">
              <div className="tariff-header">
                <h3>{tariff.id}</h3>
                <span className="tariff-type">{tariff.type}</span>
              </div>
              <div className="tariff-details">
                <p><strong>Currency:</strong> {tariff.currency}</p>
                {tariff.display_text && <p><strong>Description:</strong> {tariff.display_text}</p>}
                <div className="price-components">
                  {tariff.elements?.[0]?.price_components?.map((pc: any, i: number) => (
                    <span key={i} className="price-badge">
                      {pc.type}: {tariff.currency} {pc.price}
                    </span>
                  ))}
                </div>
              </div>
              <div className="tariff-actions">
                <button className="btn-small" onClick={() => handleEdit(tariff)}>Edit</button>
                <button className="btn-small btn-danger" onClick={() => handleDelete(tariff.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
