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
  const [addingEvse, setAddingEvse] = useState<string | null>(null);
  const [evseId, setEvseId] = useState('');
  const [evseStatus, setEvseStatus] = useState('AVAILABLE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddEvse = async (locationId: string) => {
    if (!evseId.trim()) {
      setError('EVSE ID is required');
      return;
    }
    
    setLoading(true);
    setError('');

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
        setError(data.status_message || 'Failed to add EVSE');
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
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
                      setError('');
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
                        disabled={loading}
                      >
                        {loading ? '...' : 'Add'}
                      </button>
                    </div>
                    {error && <div className="error-small">{error}</div>}
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
                        {evse.connectors && evse.connectors.length > 0 ? (
                          <div className="connectors">
                            {evse.connectors.map((connector: any) => (
                              <div key={connector.id} className="connector-item">
                                <span className="connector-type">{connector.standard}</span>
                                <span className="power">
                                  {connector.power_kw ? `${connector.power_kw}kW` : `${connector.amperage}A`}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-connectors">No connectors yet</p>
                        )}
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
