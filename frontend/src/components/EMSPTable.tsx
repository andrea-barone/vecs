import { useState } from 'react';

interface EMSP {
  id: string;
  token: string;
  party_id: string;
  country_code: string;
  business_name: string;
  business_website?: string;
  version: string;
  expires_at: string;
  endpoints?: Record<string, string>;
  created_at: string;
}

interface Props {
  emsps: EMSP[];
  onSelectEMSP: (emsp: EMSP) => void;
  onRefresh: () => void;
}

export function EMSPTable({ emsps, onSelectEMSP, onRefresh }: Props) {
  const [sortField, setSortField] = useState<'party_id' | 'business_name' | 'expires_at'>('business_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...emsps].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h2>Registered eMSPs</h2>
        <button className="btn btn-secondary" onClick={onRefresh}>Refresh</button>
      </div>

      {emsps.length === 0 ? (
        <div className="empty-state">
          <p>No eMSPs registered</p>
          <p className="text-muted">eMSPs can register via POST /ocpi/2.2.1/credentials</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('party_id')}>
                Party {sortField === 'party_id' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="sortable" onClick={() => toggleSort('business_name')}>
                Business Name {sortField === 'business_name' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>Version</th>
              <th>Endpoints</th>
              <th className="sortable" onClick={() => toggleSort('expires_at')}>
                Expires {sortField === 'expires_at' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(emsp => (
              <tr key={emsp.id} className="clickable" onClick={() => onSelectEMSP(emsp)}>
                <td className="mono">{emsp.country_code}-{emsp.party_id}</td>
                <td>{emsp.business_name}</td>
                <td>v{emsp.version}</td>
                <td>{emsp.endpoints ? Object.keys(emsp.endpoints).filter(k => emsp.endpoints![k]).length : 0}</td>
                <td className="mono">{new Date(emsp.expires_at).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${isExpired(emsp.expires_at) ? 'status-blocked' : 'status-available'}`}>
                    {isExpired(emsp.expires_at) ? 'Expired' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
