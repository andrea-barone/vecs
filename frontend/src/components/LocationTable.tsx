import { useState } from 'react';

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
  evses: any[];
  last_updated?: string;
}

interface Props {
  locations: Location[];
  onSelectLocation: (location: Location) => void;
  onCreateNew: () => void;
}

export function LocationTable({ locations, onSelectLocation, onCreateNew }: Props) {
  const [sortField, setSortField] = useState<'id' | 'city' | 'evses'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedLocations = [...locations].sort((a, b) => {
    let aVal: string | number, bVal: string | number;
    if (sortField === 'evses') {
      aVal = a.evses?.length || 0;
      bVal = b.evses?.length || 0;
    } else if (sortField === 'city') {
      aVal = a.city.toLowerCase();
      bVal = b.city.toLowerCase();
    } else {
      aVal = a.id.toLowerCase();
      bVal = b.id.toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'id' | 'city' | 'evses') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: 'id' | 'city' | 'evses' }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const countConnectors = (location: Location) => {
    return location.evses?.reduce((acc, evse) => acc + (evse.connectors?.length || 0), 0) || 0;
  };

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h2>Locations</h2>
        <button className="btn btn-primary" onClick={onCreateNew}>
          + New Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="empty-state">
          <p>No locations found</p>
          <p className="text-small">Create a location to get started</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} className="sortable">
                Location ID <SortIcon field="id" />
              </th>
              <th>Name</th>
              <th>Type</th>
              <th>Address</th>
              <th onClick={() => handleSort('city')} className="sortable">
                City <SortIcon field="city" />
              </th>
              <th onClick={() => handleSort('evses')} className="sortable">
                EVSEs <SortIcon field="evses" />
              </th>
              <th>Connectors</th>
            </tr>
          </thead>
          <tbody>
            {sortedLocations.map((location) => (
              <tr 
                key={location.id} 
                onClick={() => onSelectLocation(location)}
                className="clickable"
              >
                <td className="mono">{location.id}</td>
                <td>{location.name || '—'}</td>
                <td>
                  <span className="type-badge">{location.type}</span>
                </td>
                <td className="truncate">{location.address}</td>
                <td>{location.city}, {location.country}</td>
                <td className="center">{location.evses?.length || 0}</td>
                <td className="center">{countConnectors(location)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
