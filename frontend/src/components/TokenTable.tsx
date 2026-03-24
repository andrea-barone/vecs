import { useState } from 'react';

interface Token {
  uid: string;
  type: string;
  auth_id: string;
  visual_number?: string;
  issuer: string;
  valid: boolean;
  whitelist?: string;
  last_updated: string;
}

interface Props {
  tokens: Token[];
  onSelectToken: (token: Token) => void;
  onCreateNew: () => void;
  onCreateSamples: () => void;
}

export function TokenTable({ tokens, onSelectToken, onCreateNew, onCreateSamples }: Props) {
  const [sortField, setSortField] = useState<'uid' | 'type' | 'issuer'>('uid');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...tokens].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h2>Tokens</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onCreateSamples}>Create Samples</button>
          <button className="btn btn-primary" onClick={onCreateNew}>+ New Token</button>
        </div>
      </div>

      {tokens.length === 0 ? (
        <div className="empty-state"><p>No tokens yet. Create samples or add a new one.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('uid')}>
                Token UID {sortField === 'uid' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="sortable" onClick={() => toggleSort('type')}>
                Type {sortField === 'type' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>Auth ID</th>
              <th className="sortable" onClick={() => toggleSort('issuer')}>
                Issuer {sortField === 'issuer' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>Status</th>
              <th>Whitelist</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(token => (
              <tr key={token.uid} className="clickable" onClick={() => onSelectToken(token)}>
                <td className="mono">{token.uid}</td>
                <td><span className="type-badge">{token.type}</span></td>
                <td>{token.auth_id}</td>
                <td>{token.issuer}</td>
                <td>
                  <span className={`status-badge ${token.valid ? 'status-available' : 'status-blocked'}`}>
                    {token.valid ? 'Valid' : 'Blocked'}
                  </span>
                </td>
                <td>{token.whitelist || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
