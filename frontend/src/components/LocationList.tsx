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
  display_text?: string;
}

interface Props {
  locations: Location[];
  apiBase: string;
  token: string;
  selectedLocation: string | null;
  onSelectLocation: (id: string | null) => void;
  onLocationUpdated: () => void;
}

export function LocationList({
  locations,
  apiBase,
  selectedLocation,
  onSelectLocation,
  onLocationUpdated,
}: Props) {
  // Tariffs
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  // Edit location state
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState('OTHER');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locCountry, setLocCountry] = useState('');
  const [locPostalCode, setLocPostalCode] = useState('');
  const [locOperator, setLocOperator] = useState('');

  // EVSE form state
  const [addingEvse, setAddingEvse] = useState<string | null>(null);
  const [editingEvse, setEditingEvse] = useState<string | null>(null);
  const [evseId, setEvseId] = useState('');
  const [evseStatus, setEvseStatus] = useState('AVAILABLE');
  const [evseFloorLevel, setEvseFloorLevel] = useState('');
  const [evseLoading, setEvseLoading] = useState(false);
  const [evseError, setEvseError] = useState('');

  // Connector form state
  const [addingConnector, setAddingConnector] = useState<string | null>(null);
  const [editingConnector, setEditingConnector] = useState<string | null>(null);
  const [connectorId, setConnectorId] = useState('1');
  const [connectorStandard, setConnectorStandard] = useState('IEC_62196_T2_COMBO');
  const [connectorFormat, setConnectorFormat] = useState('CABLE');
  const [connectorPowerType, setConnectorPowerType] = useState('DC');
  const [connectorVoltage, setConnectorVoltage] = useState('400');
  const [connectorAmperage, setConnectorAmperage] = useState('125');
  const [connectorPowerKw, setConnectorPowerKw] = useState('50');
  const [connectorTariff, setConnectorTariff] = useState('');
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [connectorError, setConnectorError] = useState('');

  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/tariffs`);
      const data = await response.json();
      if (data.status_code === 1000) {
        setTariffs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching tariffs:', err);
    }
  };

  // ============ LOCATION HANDLERS ============

  const startEditLocation = (location: Location) => {
    setEditingLocation(location.id);
    setLocName(location.name || '');
    setLocType(location.type);
    setLocAddress(location.address);
    setLocCity(location.city);
    setLocCountry(location.country);
    setLocPostalCode(location.postal_code || '');
    setLocOperator(location.operator?.name || '');
  };

  const handleUpdateLocation = async (locationId: string) => {
    setLocLoading(true);
    setLocError('');

    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locName || null,
          type: locType,
          address: locAddress,
          city: locCity,
          country: locCountry,
          postal_code: locPostalCode,
          operator_name: locOperator || null,
        }),
      });

      const data = await response.json();
      if (data.status_code === 1000) {
        setEditingLocation(null);
        onLocationUpdated();
      } else {
        setLocError(data.status_message);
      }
    } catch (err) {
      setLocError(`Error: ${err}`);
    } finally {
      setLocLoading(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Delete this location and all its EVSEs?')) return;
    
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/locations/${locationId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status_code === 1000) {
        onLocationUpdated();
      } else {
        alert(data.status_message);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  // ============ EVSE HANDLERS ============

  const handleAddEvse = async (locationId: string) => {
    if (!evseId.trim()) {
      setEvseError('EVSE ID is required');
      return;
    }
    
    setEvseLoading(true);
    setEvseError('');

    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/locations/${locationId}/evses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evse_id: evseId,
          status: evseStatus,
          floor_level: evseFloorLevel || undefined,
        }),
      });

      const data = await response.json();
      if (data.status_code === 1001) {
        setEvseId('');
        setEvseFloorLevel('');
        setAddingEvse(null);
        onLocationUpdated();
      } else {
        setEvseError(data.status_message);
      }
    } catch (err) {
      setEvseError(`Error: ${err}`);
    } finally {
      setEvseLoading(false);
    }
  };

  const handleUpdateEvse = async (locationId: string, evseIdParam: string) => {
    setEvseLoading(true);
    setEvseError('');

    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/locations/${locationId}/evses/${evseIdParam}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: evseStatus,
          floor_level: evseFloorLevel || null,
        }),
      });

      const data = await response.json();
      if (data.status_code === 1000) {
        setEditingEvse(null);
        onLocationUpdated();
      } else {
        setEvseError(data.status_message);
      }
    } catch (err) {
      setEvseError(`Error: ${err}`);
    } finally {
      setEvseLoading(false);
    }
  };

  const handleDeleteEvse = async (locationId: string, evseIdParam: string) => {
    if (!confirm('Delete this EVSE and all its connectors?')) return;
    
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/locations/${locationId}/evses/${evseIdParam}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status_code === 1000) {
        onLocationUpdated();
      } else {
        alert(data.status_message);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const startEditEvse = (evse: any) => {
    setEditingEvse(evse.evse_id);
    setEvseStatus(evse.status);
    setEvseFloorLevel(evse.floor_level || '');
  };

  // ============ CONNECTOR HANDLERS ============

  const handleAddConnector = async (locationId: string, evseIdParam: string) => {
    setConnectorLoading(true);
    setConnectorError('');

    try {
      const response = await fetch(
        `${apiBase}/ocpi/2.2.1/locations/${locationId}/evses/${evseIdParam}/connectors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connector_id: connectorId,
            standard: connectorStandard,
            format: connectorFormat,
            power_type: connectorPowerType,
            voltage: parseInt(connectorVoltage),
            amperage: parseInt(connectorAmperage),
            power_kw: parseFloat(connectorPowerKw),
            tariff_id: connectorTariff || undefined,
          }),
        }
      );

      const data = await response.json();
      if (data.status_code === 1001) {
        resetConnectorForm();
        setAddingConnector(null);
        onLocationUpdated();
      } else {
        setConnectorError(data.status_message);
      }
    } catch (err) {
      setConnectorError(`Error: ${err}`);
    } finally {
      setConnectorLoading(false);
    }
  };

  const handleUpdateConnector = async (locationId: string, evseIdParam: string, connIdParam: string) => {
    setConnectorLoading(true);
    setConnectorError('');

    try {
      const response = await fetch(
        `${apiBase}/ocpi/2.2.1/locations/${locationId}/evses/${evseIdParam}/connectors/${connIdParam}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            standard: connectorStandard,
            format: connectorFormat,
            power_type: connectorPowerType,
            voltage: parseInt(connectorVoltage),
            amperage: parseInt(connectorAmperage),
            power_kw: parseFloat(connectorPowerKw),
            tariff_id: connectorTariff || null,
          }),
        }
      );

      const data = await response.json();
      if (data.status_code === 1000) {
        setEditingConnector(null);
        onLocationUpdated();
      } else {
        setConnectorError(data.status_message);
      }
    } catch (err) {
      setConnectorError(`Error: ${err}`);
    } finally {
      setConnectorLoading(false);
    }
  };

  const handleDeleteConnector = async (locationId: string, evseIdParam: string, connIdParam: string) => {
    if (!confirm('Delete this connector?')) return;
    
    try {
      const response = await fetch(
        `${apiBase}/ocpi/2.2.1/locations/${locationId}/evses/${evseIdParam}/connectors/${connIdParam}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.status_code === 1000) {
        onLocationUpdated();
      } else {
        alert(data.status_message);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const startEditConnector = (connector: any) => {
    setEditingConnector(connector.id);
    setConnectorId(connector.id);
    setConnectorStandard(connector.standard);
    setConnectorFormat(connector.format);
    setConnectorPowerType(connector.power_type);
    setConnectorVoltage(connector.voltage?.toString() || '400');
    setConnectorAmperage(connector.amperage?.toString() || '125');
    setConnectorPowerKw(connector.power_kw?.toString() || '50');
    setConnectorTariff(connector.tariff_id || '');
  };

  const resetConnectorForm = () => {
    setConnectorId('1');
    setConnectorStandard('IEC_62196_T2_COMBO');
    setConnectorFormat('CABLE');
    setConnectorPowerType('DC');
    setConnectorVoltage('400');
    setConnectorAmperage('125');
    setConnectorPowerKw('50');
    setConnectorTariff('');
  };

  if (locations.length === 0) {
    return (
      <div className="empty-state">
        <p>📭 No locations found</p>
        <p className="text-small">Create a location to get started</p>
      </div>
    );
  }

  return (
    <div className="location-grid">
      {locations.map((location) => (
        <div
          key={location.id}
          className={`location-card ${selectedLocation === location.id ? 'selected' : ''}`}
        >
          {/* Location Header */}
          <div 
            className="location-header"
            onClick={() => onSelectLocation(selectedLocation === location.id ? null : location.id)}
            style={{ cursor: 'pointer' }}
          >
            <h3>📍 {location.id}</h3>
            <span className="evse-count">{location.evses?.length || 0} EVSEs</span>
          </div>

          {/* Location Details - View Mode */}
          {editingLocation !== location.id && (
            <div className="location-details">
              {location.name && <p><strong>Name:</strong> {location.name}</p>}
              <p><strong>Type:</strong> {location.type}</p>
              <p><strong>Address:</strong> {location.address}</p>
              <p><strong>City:</strong> {location.city}, {location.country}</p>
              {location.operator?.name && <p><strong>Operator:</strong> {location.operator.name}</p>}
            </div>
          )}

          {/* Location Details - Edit Mode */}
          {editingLocation === location.id && (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Location name" />
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
                <input value={locOperator} onChange={(e) => setLocOperator(e.target.value)} placeholder="Operator name" />
              </div>
              {locError && <div className="error-small">{locError}</div>}
              <div className="button-row">
                <button className="btn-small btn-primary" onClick={() => handleUpdateLocation(location.id)} disabled={locLoading}>
                  {locLoading ? '...' : 'Save'}
                </button>
                <button className="btn-small" onClick={() => setEditingLocation(null)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedLocation === location.id && editingLocation !== location.id && (
            <div className="location-actions">
              <button className="btn-small" onClick={(e) => { e.stopPropagation(); startEditLocation(location); }}>✏️ Edit</button>
              <button className="btn-small btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteLocation(location.id); }}>🗑️ Delete</button>
            </div>
          )}

          {/* Expanded details when selected */}
          {selectedLocation === location.id && (
            <div className="location-expanded">
              {location.coordinates && (
                <div className="detail-row">
                  <strong>🌍 Coordinates:</strong> {location.coordinates.latitude.toFixed(4)}, {location.coordinates.longitude.toFixed(4)}
                </div>
              )}

              {/* EVSEs Section */}
              <div className="evse-section">
                <div className="evse-section-header">
                  <h4>⚡ Charge Points ({location.evses?.length || 0})</h4>
                  <button
                    className="btn-small btn-add"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingEvse(addingEvse === location.id ? null : location.id);
                      setEvseError('');
                    }}
                  >
                    {addingEvse === location.id ? '✕ Cancel' : '+ Add EVSE'}
                  </button>
                </div>

                {/* Add EVSE Form */}
                {addingEvse === location.id && (
                  <div className="add-evse-form">
                    <div className="form-row-inline">
                      <input
                        type="text"
                        placeholder="EVSE ID"
                        value={evseId}
                        onChange={(e) => setEvseId(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <select value={evseStatus} onChange={(e) => setEvseStatus(e.target.value)} onClick={(e) => e.stopPropagation()}>
                        <option>AVAILABLE</option>
                        <option>CHARGING</option>
                        <option>BLOCKED</option>
                        <option>INOPERATIVE</option>
                        <option>OUTOFSERVICE</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Floor"
                        value={evseFloorLevel}
                        onChange={(e) => setEvseFloorLevel(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '60px' }}
                      />
                      <button className="btn-small btn-primary" onClick={(e) => { e.stopPropagation(); handleAddEvse(location.id); }} disabled={evseLoading}>
                        {evseLoading ? '...' : 'Add'}
                      </button>
                    </div>
                    {evseError && <div className="error-small">{evseError}</div>}
                  </div>
                )}

                {/* EVSE List */}
                {location.evses && location.evses.length > 0 ? (
                  <div className="evse-list">
                    {location.evses.map((evse) => (
                      <div key={evse.evse_id || evse.uid} className="evse-item">
                        {/* EVSE Header - View Mode */}
                        {editingEvse !== evse.evse_id && (
                          <>
                            <div className="evse-header">
                              <span className="evse-id">{evse.evse_id}</span>
                              <span className={`status ${evse.status?.toLowerCase()}`}>{evse.status}</span>
                              {evse.floor_level && <span className="floor">Floor: {evse.floor_level}</span>}
                              <div className="evse-actions">
                                <button className="btn-tiny" onClick={(e) => { e.stopPropagation(); startEditEvse(evse); }}>✏️</button>
                                <button className="btn-tiny btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteEvse(location.id, evse.evse_id); }}>🗑️</button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* EVSE Edit Mode */}
                        {editingEvse === evse.evse_id && (
                          <div className="edit-form-inline">
                            <select value={evseStatus} onChange={(e) => setEvseStatus(e.target.value)}>
                              <option>AVAILABLE</option>
                              <option>CHARGING</option>
                              <option>BLOCKED</option>
                              <option>INOPERATIVE</option>
                              <option>OUTOFSERVICE</option>
                            </select>
                            <input placeholder="Floor" value={evseFloorLevel} onChange={(e) => setEvseFloorLevel(e.target.value)} style={{ width: '60px' }} />
                            <button className="btn-tiny btn-primary" onClick={() => handleUpdateEvse(location.id, evse.evse_id)} disabled={evseLoading}>Save</button>
                            <button className="btn-tiny" onClick={() => setEditingEvse(null)}>✕</button>
                            {evseError && <div className="error-small">{evseError}</div>}
                          </div>
                        )}

                        {/* Connectors */}
                        <div className="connectors-section">
                          <div className="connectors-header">
                            <span className="connectors-label">🔌 Connectors ({evse.connectors?.length || 0})</span>
                            <button
                              className="btn-tiny btn-add"
                              onClick={(e) => {
                                e.stopPropagation();
                                const key = `${location.id}:${evse.evse_id}`;
                                if (addingConnector === key) {
                                  setAddingConnector(null);
                                } else {
                                  setAddingConnector(key);
                                  resetConnectorForm();
                                }
                                setConnectorError('');
                              }}
                            >
                              {addingConnector === `${location.id}:${evse.evse_id}` ? '✕' : '+'}
                            </button>
                          </div>

                          {/* Add/Edit Connector Form */}
                          {(addingConnector === `${location.id}:${evse.evse_id}` || editingConnector) && (
                            <div className="add-connector-form">
                              <div className="connector-form-grid">
                                <div className="form-field">
                                  <label>ID</label>
                                  <input type="text" value={connectorId} onChange={(e) => setConnectorId(e.target.value)} disabled={!!editingConnector} />
                                </div>
                                <div className="form-field">
                                  <label>Standard</label>
                                  <select value={connectorStandard} onChange={(e) => setConnectorStandard(e.target.value)}>
                                    <option value="IEC_62196_T2_COMBO">CCS2</option>
                                    <option value="CHADEMO">CHAdeMO</option>
                                    <option value="IEC_62196_T2">Type 2</option>
                                    <option value="IEC_62196_T1">Type 1</option>
                                    <option value="NACS">NACS</option>
                                    <option value="GB_T">GB/T</option>
                                  </select>
                                </div>
                                <div className="form-field">
                                  <label>Format</label>
                                  <select value={connectorFormat} onChange={(e) => setConnectorFormat(e.target.value)}>
                                    <option value="CABLE">Cable</option>
                                    <option value="SOCKET">Socket</option>
                                  </select>
                                </div>
                                <div className="form-field">
                                  <label>Power</label>
                                  <select value={connectorPowerType} onChange={(e) => setConnectorPowerType(e.target.value)}>
                                    <option value="DC">DC</option>
                                    <option value="AC_3_PHASE">AC 3φ</option>
                                    <option value="AC_1_PHASE">AC 1φ</option>
                                  </select>
                                </div>
                                <div className="form-field">
                                  <label>V</label>
                                  <input type="number" value={connectorVoltage} onChange={(e) => setConnectorVoltage(e.target.value)} />
                                </div>
                                <div className="form-field">
                                  <label>A</label>
                                  <input type="number" value={connectorAmperage} onChange={(e) => setConnectorAmperage(e.target.value)} />
                                </div>
                                <div className="form-field">
                                  <label>kW</label>
                                  <input type="number" value={connectorPowerKw} onChange={(e) => setConnectorPowerKw(e.target.value)} />
                                </div>
                                <div className="form-field">
                                  <label>Tariff</label>
                                  <select value={connectorTariff} onChange={(e) => setConnectorTariff(e.target.value)}>
                                    <option value="">-- None --</option>
                                    {tariffs.map((t) => (
                                      <option key={t.id} value={t.id}>{t.id}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="button-row">
                                {editingConnector ? (
                                  <>
                                    <button className="btn-small btn-primary" onClick={() => handleUpdateConnector(location.id, evse.evse_id, editingConnector)} disabled={connectorLoading}>
                                      {connectorLoading ? '...' : 'Save'}
                                    </button>
                                    <button className="btn-small" onClick={() => { setEditingConnector(null); resetConnectorForm(); }}>Cancel</button>
                                  </>
                                ) : (
                                  <button className="btn-small btn-primary" onClick={() => handleAddConnector(location.id, evse.evse_id)} disabled={connectorLoading}>
                                    {connectorLoading ? '...' : 'Add'}
                                  </button>
                                )}
                              </div>
                              {connectorError && <div className="error-small">{connectorError}</div>}
                            </div>
                          )}

                          {/* Connector List */}
                          {evse.connectors && evse.connectors.length > 0 ? (
                            <div className="connectors">
                              {evse.connectors.map((connector: any) => (
                                <div key={connector.id} className="connector-item">
                                  <span className="connector-id">#{connector.id}</span>
                                  <span className="connector-type">{connector.standard}</span>
                                  <span className="connector-format">{connector.format}</span>
                                  <span className="power">{connector.power_kw ? `${connector.power_kw}kW` : `${connector.voltage}V`}</span>
                                  {connector.tariff_id && <span className="tariff-badge">💰 {connector.tariff_id}</span>}
                                  <div className="connector-actions">
                                    <button className="btn-tiny" onClick={(e) => { e.stopPropagation(); startEditConnector(connector); setAddingConnector(`${location.id}:${evse.evse_id}`); }}>✏️</button>
                                    <button className="btn-tiny btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteConnector(location.id, evse.evse_id, connector.id); }}>🗑️</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="no-connectors">No connectors</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-evses">No charge points yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
