import { useState, useEffect } from 'react';

interface Location {
  id: string;
  type: string;
  name?: string;
  address: string;
  city: string;
  country: string;
  postal_code?: string;
  coordinates?: { latitude: number; longitude: number };
  operator?: { name: string };
  time_zone?: string;
  charging_when_closed?: boolean;
  evses: any[];
  last_updated?: string;
}

interface Tariff {
  id: string;
  currency: string;
  type: string;
}

interface Props {
  location: Location;
  apiBase: string;
  onBack: () => void;
  onLocationUpdated: () => void;
}

export function LocationDetail({ location, apiBase, onBack, onLocationUpdated }: Props) {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'evses' | 'json'>('overview');
  
  // Edit states
  const [editing, setEditing] = useState(false);
  const [locName, setLocName] = useState(location.name || '');
  const [locType, setLocType] = useState(location.type);
  const [locAddress, setLocAddress] = useState(location.address);
  const [locCity, setLocCity] = useState(location.city);
  const [locCountry, setLocCountry] = useState(location.country);
  const [locPostalCode, setLocPostalCode] = useState(location.postal_code || '');
  const [locOperator, setLocOperator] = useState(location.operator?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // EVSE states
  const [addingEvse, setAddingEvse] = useState(false);
  const [evseId, setEvseId] = useState('');
  const [evseStatus, setEvseStatus] = useState('AVAILABLE');
  const [evseFloor, setEvseFloor] = useState('');
  
  // Connector states
  const [addingConnector, setAddingConnector] = useState<string | null>(null);
  const [connId, setConnId] = useState('1');
  const [connStandard, setConnStandard] = useState('IEC_62196_T2_COMBO');
  const [connFormat, setConnFormat] = useState('CABLE');
  const [connPowerType, setConnPowerType] = useState('DC');
  const [connVoltage, setConnVoltage] = useState('400');
  const [connAmperage, setConnAmperage] = useState('125');
  const [connPowerKw, setConnPowerKw] = useState('50');
  const [connTariff, setConnTariff] = useState('');

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/tariffs`, { cache: 'no-store' });
      const data = await res.json();
      if (data.status_code === 1000) setTariffs(data.data || []);
    } catch (err) {
      console.error('Error fetching tariffs:', err);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locName || null,
          type: locType,
          address: locAddress,
          city: locCity,
          country: locCountry,
          postal_code: locPostalCode || null,
          operator_name: locOperator || null,
        }),
      });
      const data = await res.json();
      if (data.status_code === 1000) {
        setEditing(false);
        onLocationUpdated();
      } else {
        setError(data.status_message);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this location and all its EVSEs?')) return;
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/locations/${location.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status_code === 1000) {
        onBack();
        onLocationUpdated();
      } else {
        alert(data.status_message);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const handleAddEvse = async () => {
    if (!evseId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/locations/${location.id}/evses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evse_id: evseId,
          status: evseStatus,
          floor_level: evseFloor || undefined,
        }),
      });
      const data = await res.json();
      if (data.status_code === 1001) {
        setEvseId('');
        setEvseFloor('');
        setAddingEvse(false);
        onLocationUpdated();
      } else {
        setError(data.status_message);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvse = async (evseId: string) => {
    if (!confirm('Delete this EVSE?')) return;
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/locations/${location.id}/evses/${evseId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status_code === 1000) onLocationUpdated();
      else alert(data.status_message);
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const handleAddConnector = async (evseId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/locations/${location.id}/evses/${evseId}/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector_id: connId,
          standard: connStandard,
          format: connFormat,
          power_type: connPowerType,
          voltage: parseInt(connVoltage),
          amperage: parseInt(connAmperage),
          power_kw: parseFloat(connPowerKw),
          tariff_id: connTariff || undefined,
        }),
      });
      const data = await res.json();
      if (data.status_code === 1001) {
        setAddingConnector(null);
        resetConnectorForm();
        onLocationUpdated();
      } else {
        setError(data.status_message);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnector = async (evseId: string, connectorId: string) => {
    if (!confirm('Delete this connector?')) return;
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/locations/${location.id}/evses/${evseId}/connectors/${connectorId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status_code === 1000) onLocationUpdated();
      else alert(data.status_message);
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const resetConnectorForm = () => {
    setConnId('1');
    setConnStandard('IEC_62196_T2_COMBO');
    setConnFormat('CABLE');
    setConnPowerType('DC');
    setConnVoltage('400');
    setConnAmperage('125');
    setConnPowerKw('50');
    setConnTariff('');
  };

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <div className="detail-title">
          <h2>{location.id}</h2>
          {location.name && <span className="detail-subtitle">{location.name}</span>}
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
        <button className={`detail-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`detail-tab ${activeTab === 'evses' ? 'active' : ''}`} onClick={() => setActiveTab('evses')}>
          EVSEs ({location.evses?.length || 0})
        </button>
        <button className={`detail-tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>
          Raw JSON
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {activeTab === 'overview' && (
        <div className="detail-content">
          {editing ? (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input value={locName} onChange={(e) => setLocName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={locType} onChange={(e) => setLocType(e.target.value)}>
                    <option value="OTHER">Other</option>
                    <option value="ON_STREET">On Street</option>
                    <option value="PARKING_GARAGE">Parking Garage</option>
                    <option value="PARKING_LOT">Parking Lot</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={locAddress} onChange={(e) => setLocAddress(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input value={locCity} onChange={(e) => setLocCity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input value={locCountry} onChange={(e) => setLocCountry(e.target.value)} maxLength={2} />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input value={locPostalCode} onChange={(e) => setLocPostalCode(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Operator</label>
                <input value={locOperator} onChange={(e) => setLocOperator(e.target.value)} />
              </div>
              <div className="button-row">
                <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Type</span>
                <span className="info-value">{location.type}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Address</span>
                <span className="info-value">{location.address}</span>
              </div>
              <div className="info-row">
                <span className="info-label">City</span>
                <span className="info-value">{location.city}, {location.country} {location.postal_code}</span>
              </div>
              {location.operator?.name && (
                <div className="info-row">
                  <span className="info-label">Operator</span>
                  <span className="info-value">{location.operator.name}</span>
                </div>
              )}
              {location.coordinates && (
                <div className="info-row">
                  <span className="info-label">Coordinates</span>
                  <span className="info-value mono">{location.coordinates.latitude}, {location.coordinates.longitude}</span>
                </div>
              )}
              {location.time_zone && (
                <div className="info-row">
                  <span className="info-label">Time Zone</span>
                  <span className="info-value">{location.time_zone}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Last Updated</span>
                <span className="info-value mono">{location.last_updated || '—'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'evses' && (
        <div className="detail-content">
          <div className="section-header">
            <span>Charge Points</span>
            <button className="btn btn-primary btn-small" onClick={() => setAddingEvse(!addingEvse)}>
              {addingEvse ? 'Cancel' : '+ Add EVSE'}
            </button>
          </div>

          {addingEvse && (
            <div className="add-form">
              <div className="form-row-inline">
                <input placeholder="EVSE ID" value={evseId} onChange={(e) => setEvseId(e.target.value)} />
                <select value={evseStatus} onChange={(e) => setEvseStatus(e.target.value)}>
                  <option>AVAILABLE</option>
                  <option>CHARGING</option>
                  <option>BLOCKED</option>
                  <option>OUTOFSERVICE</option>
                </select>
                <input placeholder="Floor" value={evseFloor} onChange={(e) => setEvseFloor(e.target.value)} style={{ width: 80 }} />
                <button className="btn btn-primary" onClick={handleAddEvse} disabled={loading}>Add</button>
              </div>
            </div>
          )}

          {location.evses?.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>EVSE ID</th>
                  <th>Status</th>
                  <th>Floor</th>
                  <th>Connectors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {location.evses.map((evse) => (
                  <>
                    <tr key={evse.evse_id}>
                      <td className="mono">{evse.evse_id}</td>
                      <td><span className={`status-badge status-${evse.status?.toLowerCase()}`}>{evse.status}</span></td>
                      <td>{evse.floor_level || '—'}</td>
                      <td>{evse.connectors?.length || 0}</td>
                      <td>
                        <button className="btn-tiny btn-add" onClick={() => setAddingConnector(addingConnector === evse.evse_id ? null : evse.evse_id)}>+ Conn</button>
                        <button className="btn-tiny btn-danger" onClick={() => handleDeleteEvse(evse.evse_id)}>Delete</button>
                      </td>
                    </tr>
                    {addingConnector === evse.evse_id && (
                      <tr className="form-row-nested">
                        <td colSpan={5}>
                          <div className="connector-form">
                            <div className="form-row-inline">
                              <input placeholder="ID" value={connId} onChange={(e) => setConnId(e.target.value)} style={{ width: 50 }} />
                              <select value={connStandard} onChange={(e) => setConnStandard(e.target.value)}>
                                <option value="IEC_62196_T2_COMBO">CCS2</option>
                                <option value="CHADEMO">CHAdeMO</option>
                                <option value="IEC_62196_T2">Type 2</option>
                                <option value="NACS">NACS</option>
                              </select>
                              <select value={connFormat} onChange={(e) => setConnFormat(e.target.value)}>
                                <option value="CABLE">Cable</option>
                                <option value="SOCKET">Socket</option>
                              </select>
                              <select value={connPowerType} onChange={(e) => setConnPowerType(e.target.value)}>
                                <option value="DC">DC</option>
                                <option value="AC_3_PHASE">AC 3φ</option>
                                <option value="AC_1_PHASE">AC 1φ</option>
                              </select>
                              <input placeholder="V" value={connVoltage} onChange={(e) => setConnVoltage(e.target.value)} style={{ width: 60 }} />
                              <input placeholder="A" value={connAmperage} onChange={(e) => setConnAmperage(e.target.value)} style={{ width: 60 }} />
                              <input placeholder="kW" value={connPowerKw} onChange={(e) => setConnPowerKw(e.target.value)} style={{ width: 60 }} />
                              <select value={connTariff} onChange={(e) => setConnTariff(e.target.value)}>
                                <option value="">No Tariff</option>
                                {tariffs.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
                              </select>
                              <button className="btn btn-primary btn-small" onClick={() => handleAddConnector(evse.evse_id)}>Add</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {evse.connectors?.map((conn: any) => (
                      <tr key={`${evse.evse_id}-${conn.id}`} className="nested-row">
                        <td></td>
                        <td className="mono">└ #{conn.id}</td>
                        <td><span className="type-badge">{conn.standard}</span></td>
                        <td>{conn.power_kw}kW {conn.power_type}</td>
                        <td>
                          <button className="btn-tiny btn-danger" onClick={() => handleDeleteConnector(evse.evse_id, conn.id)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No EVSEs configured</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'json' && (
        <div className="detail-content">
          <div className="json-viewer">
            {JSON.stringify(location, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}
