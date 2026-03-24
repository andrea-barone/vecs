import { useState } from 'react';

interface Tariff {
  id: string;
  currency: string;
  type: string;
  display_text?: string;
  elements: any[];
  last_updated: string;
}

interface Props {
  tariffs: Tariff[];
  onSelectTariff: (tariff: Tariff) => void;
  onCreateNew: () => void;
}

export function TariffTable({ tariffs, onSelectTariff, onCreateNew }: Props) {
  const [sortField, setSortField] = useState<'id' | 'type' | 'currency'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...tariffs].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const getEnergyPrice = (tariff: Tariff) => {
    const energy = tariff.elements?.[0]?.price_components?.find((p: any) => p.type === 'ENERGY');
    return energy ? `${tariff.currency} ${energy.price}/kWh` : '—';
  };

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h2>Tariffs</h2>
        <button className="btn btn-primary" onClick={onCreateNew}>+ New Tariff</button>
      </div>

      {tariffs.length === 0 ? (
        <div className="empty-state"><p>No tariffs configured</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('id')}>
                Tariff ID {sortField === 'id' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="sortable" onClick={() => toggleSort('type')}>
                Type {sortField === 'type' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="sortable" onClick={() => toggleSort('currency')}>
                Currency {sortField === 'currency' && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>Energy Price</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(tariff => (
              <tr key={tariff.id} className="clickable" onClick={() => onSelectTariff(tariff)}>
                <td className="mono">{tariff.id}</td>
                <td><span className="type-badge">{tariff.type}</span></td>
                <td>{tariff.currency}</td>
                <td className="mono">{getEnergyPrice(tariff)}</td>
                <td className="truncate">{tariff.display_text || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
