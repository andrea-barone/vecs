import { useState } from 'react';

interface Location {
  id: string;
  address: string;
  city: string;
  country: string;
  postal_code?: string;
  coordinates?: { latitude: number; longitude: number };
  operator?: { name: string };
  evses: any[];
  last_updated?: string;
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
  // EVSE form state
  const [addingEvse, setAddingEvse] = useState<string | null>(null);
  const [evseId, setEvseId] = useState('');
  const [evseStatus, setEvseStatus] = useState('AVAILABLE');
  const [evseLoading, setEvseLoading] = useState(false);
  const [evseError, setEvseError] = useState('');

  // Connector form state
  const [addingConnector, setAddingConnector] = useState<string | null>(null);
  const [connectorId, setConnectorId] = useState('1');
  const [connectorStandard, setConnectorStandard] = useState('IEC_62196_T2_COMBO');
  const [connectorFormat, setConnectorFormat] = useState('CABLE');
  const [connectorPowerType, setConnectorPowerType] = useState('DC');
  const [connectorVoltage, setConnectorVoltage] = useState('400');
  const [connectorAmperage, setConnectorAmperage] = useState('125');
  const [connectorPowerKw, setConnectorPowerKw] = useState('50');
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [connectorError, setConnectorError] = useState('');

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
        }),
      });

      const data = await response.json();

      if (data.status_code === 1001) {
        setEvseId('');
        setAddingEvse(null);
        onLocationUpdated();
      } else {
        setEvseError(data.status_message || 'Failed to add EVSE');
      }
    } catch (err) {
      setEvseError(`Error: ${err}`);
    } finally {
      setEvseLoading(false);
    }
  };

  const handleAddConnector = async (locationId: string, evseId: string) => {
    setConnectorLoading(true);
    setConnectorError('');

    try {
      const response = await fetch(
        `${apiBase}/ocpi/2.2.1/locations/${locationId}/evses/${evseId}/connectors`,
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
          }),
        }
      );

      const data = await response.json();

      if (data.status_code === 1001) {
        setConnectorId('1');
        setAddingConnector(null);
        onLocationUpdated();
      } else {
        setConnectorError(data.status_message || 'Failed to add connector');
      }
    } catch (err) {
      setConnectorError(`Error: ${err}`);
    } finally {
      setConnectorLoading(false);
    }
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
          <div 
            className="location-header"
            onClick={() => onSelectLocation(selectedLocation === location.id ? null : location.id)}
            style={{ cursor: 'pointer' }}
          >
            <h3>📍 {location.id}</h3>
            <span className="evse-count">{location.evses?.length || 0} EVSEs</span>
          </div>

          <div className="location-details">
            <p>
              <strong>Address:</strong> {location.address}
            </p>
            <p>
              <strong>City:</strong> {location.city}, {location.country}
            </p>
            {location.operator?.name && (
              <p>
                <strong>Operator:</strong> {location.operator.name}
              </p>
            )}
          </div>

          {/* Expanded details when selected */}
          {selectedLocation === location.id && (
            <div className="location-expanded">
              {/* Coordinates */}
              {location.coordinates && (
                <div className="detail-row">
                  <strong>🌍 Coordinates:</strong>{' '}
                  {location.coordinates.latitude.toFixed(4)}, {location.coordinates.longitude.toFixed(4)}
                </div>
              )}

              {/* Last Updated */}
              {location.last_updated && (
                <div className="detail-row">
                  <strong>🕐 Updated:</strong>{' '}
                  {new Date(location.last_updated).toLocaleString()}
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
                        placeholder="EVSE ID (e.g., EVSE-001)"
                        value={evseId}
                        onChange={(e) => setEvseId(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <select 
                        value={evseStatus} 
                        onChange={(e) => setEvseStatus(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option>AVAILABLE</option>
                        <option>CHARGING</option>
                        <option>BLOCKED</option>
                        <option>INOPERATIVE</option>
                      </select>
                      <button
                        className="btn-small btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddEvse(location.id);
                        }}
                        disabled={evseLoading}
                      >
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
                        <div className="evse-header">
                          <span className="evse-id">{evse.evse_id}</span>
                          <span className={`status ${evse.status?.toLowerCase()}`}>
                            {evse.status}
                          </span>
                        </div>

                        {/* Connectors */}
                        <div className="connectors-section">
                          <div className="connectors-header">
                            <span className="connectors-label">
                              🔌 Connectors ({evse.connectors?.length || 0})
                            </span>
                            <button
                              className="btn-tiny btn-add"
                              onClick={(e) => {
                                e.stopPropagation();
                                const key = `${location.id}:${evse.evse_id}`;
                                setAddingConnector(addingConnector === key ? null : key);
                                setConnectorError('');
                              }}
                            >
                              {addingConnector === `${location.id}:${evse.evse_id}` ? '✕' : '+'}
                            </button>
                          </div>

                          {/* Add Connector Form */}
                          {addingConnector === `${location.id}:${evse.evse_id}` && (
                            <div className="add-connector-form">
                              <div className="connector-form-grid">
                                <div className="form-field">
                                  <label>ID</label>
                                  <input
                                    type="text"
                                    value={connectorId}
                                    onChange={(e) => setConnectorId(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="1"
                                  />
                                </div>
                                <div className="form-field">
                                  <label>Standard</label>
                                  <select
                                    value={connectorStandard}
                                    onChange={(e) => setConnectorStandard(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="IEC_62196_T2_COMBO">CCS2 (Combo)</option>
                                    <option value="CHADEMO">CHAdeMO</option>
                                    <option value="IEC_62196_T2">Type 2</option>
                                    <option value="IEC_62196_T1">Type 1</option>
                                    <option value="NACS">NACS (Tesla)</option>
                                    <option value="GB_T">GB/T</option>
                                  </select>
                                </div>
                                <div className="form-field">
                                  <label>Format</label>
                                  <select
                                    value={connectorFormat}
                                    onChange={(e) => setConnectorFormat(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="CABLE">Cable</option>
                                    <option value="SOCKET">Socket</option>
                                  </select>
                                </div>
                                <div className="form-field">
                                  <label>Power</label>
                                  <select
                                    value={connectorPowerType}
                                    onChange={(e) => setConnectorPowerType(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="DC">DC</option>
                                    <option value="AC_3_PHASE">AC 3-Phase</option>
                                    <option value="AC_1_PHASE">AC 1-Phase</option>
                                  </select>
                                </div>
                                <div className="form-field">
                                  <label>Voltage</label>
                                  <input
                                    type="number"
                                    value={connectorVoltage}
                                    onChange={(e) => setConnectorVoltage(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="400"
                                  />
                                </div>
                                <div className="form-field">
                                  <label>Amperage</label>
                                  <input
                                    type="number"
                                    value={connectorAmperage}
                                    onChange={(e) => setConnectorAmperage(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="125"
                                  />
                                </div>
                                <div className="form-field">
                                  <label>kW</label>
                                  <input
                                    type="number"
                                    value={connectorPowerKw}
                                    onChange={(e) => setConnectorPowerKw(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="50"
                                  />
                                </div>
                                <div className="form-field form-field-button">
                                  <button
                                    className="btn-small btn-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddConnector(location.id, evse.evse_id);
                                    }}
                                    disabled={connectorLoading}
                                  >
                                    {connectorLoading ? '...' : 'Add Connector'}
                                  </button>
                                </div>
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
                                  <span className="power">
                                    {connector.power_kw ? `${connector.power_kw}kW` : `${connector.voltage}V/${connector.amperage}A`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="no-connectors">No connectors yet</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-evses">No charge points yet. Add one above!</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
