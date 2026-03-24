import { useState } from 'react';

interface CDR {
  id: string;
  cdr_id: string;
  start_date_time: string;
  end_date_time: string;
  auth_id: string;
  location_id: string;
  evse_uid: string;
  total_cost: { excl_vat: number; incl_vat?: number };
  total_energy: number;
  total_time: number;
}

interface Props {
  cdrs: CDR[];
  onSelectCDR: (cdr: CDR) => void;
  onRefresh: () => void;
}

export function CDRTable({ cdrs, onSelectCDR, onRefresh }: Props) {
  const [sortField, setSortField] = useState<'cdr_id' | 'total_energy' | 'start_date_time'>('start_date_time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...cdrs].sort((a, b) => {
    if (sortField === 'total_energy') {
      return sortDir === 'asc' ? a.total_energy - b.total_energy : b.total_energy - a.total_energy;
    }
    const aVal = String(a[sortField] || '');
    const bVal = String(b[sortField] || '');
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h2>Charge Detail Records</h2>
        <button className="btn btn-secondary" onClick={onRefresh}>Refresh</button>
      </div>

      {cdrs.length === 0 ? (
        <div className="empty-state"><p>No CDRs yet. Complete a session to generate one.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('cdr_id')}>
                CDR ID {sortField === 'cdr_id' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="sortable" onClick={() => toggleSort('total_energy')}>
                Energy {sortField === 'total_energy' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>Cost</th>
              <th>Duration</th>
              <th>Location</th>
              <th className="sortable" onClick={() => toggleSort('start_date_time')}>
                Date {sortField === 'start_date_time' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(cdr => (
              <tr key={cdr.id} className="clickable" onClick={() => onSelectCDR(cdr)}>
                <td className="mono">{cdr.cdr_id}</td>
                <td className="mono">{cdr.total_energy.toFixed(2)} kWh</td>
                <td className="mono">€{cdr.total_cost.excl_vat.toFixed(2)}</td>
                <td>{Math.round(cdr.total_time / 60)} min</td>
                <td>{cdr.location_id}</td>
                <td className="mono">{new Date(cdr.start_date_time).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
