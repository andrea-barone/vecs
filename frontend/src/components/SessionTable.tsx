import { useState } from 'react';

interface Session {
  id: string;
  session_id: string;
  start_date_time: string;
  end_date_time?: string;
  kwh: number;
  auth_id: string;
  location_id: string;
  evse_uid: string;
  status: string;
}

interface Props {
  sessions: Session[];
  onSelectSession: (session: Session) => void;
  onRefresh: () => void;
}

export function SessionTable({ sessions, onSelectSession, onRefresh }: Props) {
  const [sortField, setSortField] = useState<'session_id' | 'status' | 'kwh'>('session_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...sessions].sort((a, b) => {
    if (sortField === 'kwh') {
      return sortDir === 'asc' ? a.kwh - b.kwh : b.kwh - a.kwh;
    }
    const aVal = String(a[sortField] || '');
    const bVal = String(b[sortField] || '');
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h2>Sessions</h2>
        <button className="btn btn-secondary" onClick={onRefresh}>Refresh</button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state"><p>No sessions yet. Use Simulate tab to create one.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('session_id')}>
                Session ID {sortField === 'session_id' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="sortable" onClick={() => toggleSort('status')}>
                Status {sortField === 'status' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="sortable" onClick={() => toggleSort('kwh')}>
                Energy {sortField === 'kwh' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>Location</th>
              <th>EVSE</th>
              <th>Auth ID</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(session => (
              <tr key={session.id} className="clickable" onClick={() => onSelectSession(session)}>
                <td className="mono">{session.session_id}</td>
                <td><span className={`status-badge status-${session.status.toLowerCase()}`}>{session.status}</span></td>
                <td className="mono">{session.kwh.toFixed(2)} kWh</td>
                <td>{session.location_id}</td>
                <td>{session.evse_uid}</td>
                <td>{session.auth_id}</td>
                <td className="mono">{new Date(session.start_date_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
