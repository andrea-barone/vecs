interface Location {
  id: string;
  address: string;
  city: string;
  country: string;
  operator?: { name: string };
  evses: any[];
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
  selectedLocation,
  onSelectLocation,
}: Props) {
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
          onClick={() => onSelectLocation(selectedLocation === location.id ? null : location.id)}
        >
          <div className="location-header">
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

          {selectedLocation === location.id && location.evses && location.evses.length > 0 && (
            <div className="evse-list">
              <h4>⚡ Charge Points</h4>
              {location.evses.map((evse) => (
                <div key={evse.evse_id} className="evse-item">
                  <div className="evse-header">
                    <span className="evse-id">{evse.evse_id}</span>
                    <span className={`status ${evse.status?.toLowerCase()}`}>{evse.status}</span>
                  </div>
                  {evse.connectors && evse.connectors.length > 0 && (
                    <div className="connectors">
                      {evse.connectors.map((connector) => (
                        <div key={connector.id} className="connector-item">
                          <span className="connector-type">{connector.standard}</span>
                          <span className="power">{connector.power_kw || connector.amperage}A</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
