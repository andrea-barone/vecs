import { useState } from 'react';

interface Props {
  apiBase: string;
  locationId: string;
  evseId: string;
  onConnectorCreated: () => void;
}

export function ConnectorForm({ apiBase, locationId, evseId, onConnectorCreated }: Props) {
  const [connectorId, setConnectorId] = useState('1');
  const [standard, setStandard] = useState('IEC_62196_T2_COMBO');
  const [format, setFormat] = useState('CABLE');
  const [powerType, setPowerType] = useState('DC');
  const [voltage, setVoltage] = useState('400');
  const [amperage, setAmperage] = useState('125');
  const [powerKw, setPowerKw] = useState('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${apiBase}/ocpi/2.2.1/locations/${locationId}/evses/${evseId}/connectors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connector_id: connectorId,
            standard,
            format,
            power_type: powerType,
            voltage: parseInt(voltage),
            amperage: parseInt(amperage),
            power_kw: parseFloat(powerKw),
          }),
        }
      );

      const data = await response.json();

      if (data.status_code === 1001) {
        setSuccess(`✓ Connector added`);
        setConnectorId('');
        onConnectorCreated();
      } else {
        setError(`Error: ${data.status_message}`);
      }
    } catch (err) {
      setError(`Connection error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form card">
      <div className="form-row">
        <div className="form-group">
          <label>Connector ID *</label>
          <input
            type="text"
            value={connectorId}
            onChange={(e) => setConnectorId(e.target.value)}
            placeholder="1"
            required
          />
        </div>

        <div className="form-group">
          <label>Standard *</label>
          <select value={standard} onChange={(e) => setStandard(e.target.value)}>
            <option>IEC_62196_T2_COMBO</option>
            <option>CHADEMO</option>
            <option>IEC_15118_2_CCS</option>
            <option>NACS</option>
            <option>GB_T</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Format *</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option>CABLE</option>
            <option>SOCKET</option>
          </select>
        </div>

        <div className="form-group">
          <label>Power Type *</label>
          <select value={powerType} onChange={(e) => setPowerType(e.target.value)}>
            <option>DC</option>
            <option>AC_1_PHASE</option>
            <option>AC_3_PHASE</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Voltage (V) *</label>
          <input
            type="number"
            value={voltage}
            onChange={(e) => setVoltage(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Amperage (A) *</label>
          <input
            type="number"
            value={amperage}
            onChange={(e) => setAmperage(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Power (kW)</label>
          <input
            type="number"
            step="0.1"
            value={powerKw}
            onChange={(e) => setPowerKw(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? '⏳ Adding...' : '🔌 Add Connector'}
      </button>
    </form>
  );
}
