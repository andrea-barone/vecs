import { useState, useEffect } from 'react';

interface Location {
  id: string;
  evses: { uid: string; evse_id?: string; connectors: { id: string }[] }[];
}

interface CdrToken {
  country_code: string;
  party_id: string;
  uid: string;
  type: string;
  contract_id: string;
}

interface Session {
  id: string;
  kwh: number;
  status: string;
  start_date_time: string;
  cdr_token?: CdrToken;
}

interface Props {
  apiBase: string;
  onSessionChanged: () => void;
}

export function ChargingSimulator({ apiBase, onSessionChanged }: Props) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);

  const [locationId, setLocationId] = useState('');
  const [evseId, setEvseId] = useState('');
  const [connectorId, setConnectorId] = useState('');
  const [tokenUid, setTokenUid] = useState('RFID-001');
  const [tokenType, setTokenType] = useState<'RFID' | 'APP_USER' | 'AD_HOC_USER' | 'OTHER'>('RFID');
  const [powerKw, setPowerKw] = useState('50');

  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [meterKwh, setMeterKwh] = useState('0');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${apiBase}/ocpi/2.2.1/locations`, { cache: 'no-store' });
      const data = await res.json();
      if (data.status_code === 1000) {
        const locs = data.data || [];
        setLocations(locs);
        if (locs.length > 0) {
          setLocationId(locs[0].id);
          if (locs[0].evses?.length) {
            setEvseId(locs[0].evses[0].uid || locs[0].evses[0].evse_id);
            if (locs[0].evses[0].connectors?.length) {
              setConnectorId(locs[0].evses[0].connectors[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const selectedLocation = locations.find(l => l.id === locationId);
  const selectedEvse = selectedLocation?.evses?.find(e => (e.uid || e.evse_id) === evseId);

  const handleStart = async () => {
    if (!locationId || !evseId || !connectorId || !tokenUid) {
      setError('Please fill all fields');
      return;
    }

    setSimulating(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/admin/simulate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          evse_id: evseId,
          connector_id: connectorId,
          token_uid: tokenUid,
          token_type: tokenType,
          power_kw: parseFloat(powerKw),
          auto_increment: false,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setActiveSession(data.data);
        setMeterKwh('0');
        onSessionChanged();
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleUpdateMeter = async () => {
    if (!activeSession) return;
    setSimulating(true);
    try {
      const res = await fetch(`${apiBase}/admin/simulate/meter-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id, kwh: parseFloat(meterKwh) }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setActiveSession(data.data);
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;
    setSimulating(true);
    try {
      const res = await fetch(`${apiBase}/admin/simulate/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          final_kwh: parseFloat(meterKwh),
          generate_cdr: true,
          price_per_kwh: 0.35,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setActiveSession(null);
        setMeterKwh('0');
        onSessionChanged();
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="simulator-panel">
      <h2>Charging Simulator</h2>
      {error && <div className="error">{error}</div>}

      {!activeSession ? (
        <div className="start-form">
          <p className="text-muted">Start a simulated charging session to test OCPI flows</p>

          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <select value={locationId} onChange={e => {
                setLocationId(e.target.value);
                const loc = locations.find(l => l.id === e.target.value);
                if (loc?.evses?.length) {
                  setEvseId(loc.evses[0].uid || loc.evses[0].evse_id || '');
                  if (loc.evses[0].connectors?.length) setConnectorId(loc.evses[0].connectors[0].id);
                }
              }}>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.id}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>EVSE</label>
              <select value={evseId} onChange={e => {
                setEvseId(e.target.value);
                const evse = selectedLocation?.evses?.find(ev => (ev.uid || ev.evse_id) === e.target.value);
                if (evse?.connectors?.length) setConnectorId(evse.connectors[0].id);
              }}>
                {selectedLocation?.evses?.map(evse => (
                  <option key={evse.uid || evse.evse_id} value={evse.uid || evse.evse_id}>
                    {evse.uid || evse.evse_id}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Connector</label>
              <select value={connectorId} onChange={e => setConnectorId(e.target.value)}>
                {selectedEvse?.connectors?.map(conn => <option key={conn.id} value={conn.id}>{conn.id}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Token UID</label>
              <input value={tokenUid} onChange={e => setTokenUid(e.target.value)} placeholder="RFID-001" />
            </div>
            <div className="form-group">
              <label>Token Type</label>
              <select value={tokenType} onChange={e => setTokenType(e.target.value as any)}>
                <option value="RFID">RFID</option>
                <option value="APP_USER">APP_USER</option>
                <option value="AD_HOC_USER">AD_HOC_USER</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div className="form-group">
              <label>Power (kW)</label>
              <input type="number" value={powerKw} onChange={e => setPowerKw(e.target.value)} />
            </div>
          </div>

          <button className="btn btn-primary btn-large" onClick={handleStart} disabled={simulating || !selectedEvse?.connectors?.length}>
            {simulating ? 'Starting...' : 'Start Charging'}
          </button>

          {!selectedEvse?.connectors?.length && (
            <p className="text-muted" style={{ marginTop: '1rem' }}>Select a location with EVSEs and connectors to simulate</p>
          )}
        </div>
      ) : (
        <div className="active-session">
          <div className="session-card-large">
            <div className="session-header">
              <span className="mono">{activeSession.id}</span>
              <span className="status-badge status-charging">ACTIVE</span>
            </div>

            {activeSession.cdr_token && (
              <div className="token-info" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Token: {activeSession.cdr_token.uid} ({activeSession.cdr_token.type})
              </div>
            )}

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{activeSession.kwh.toFixed(2)}</div>
                <div className="stat-label">kWh</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{Math.round((Date.now() - new Date(activeSession.start_date_time).getTime()) / 60000)}</div>
                <div className="stat-label">minutes</div>
              </div>
            </div>

            <div className="meter-update">
              <div className="form-group">
                <label>Meter Value (kWh)</label>
                <input type="number" value={meterKwh} onChange={e => setMeterKwh(e.target.value)} step="0.1" />
              </div>
              <div className="quick-buttons">
                {[1, 5, 10, 25].map(v => (
                  <button key={v} className="btn btn-secondary btn-small" onClick={() => setMeterKwh((parseFloat(meterKwh) + v).toString())}>
                    +{v}
                  </button>
                ))}
              </div>
              <button className="btn btn-secondary" onClick={handleUpdateMeter} disabled={simulating}>
                {simulating ? '...' : 'Update Meter'}
              </button>
            </div>

            <button className="btn btn-danger btn-large" onClick={handleStop} disabled={simulating} style={{ marginTop: '1rem' }}>
              {simulating ? 'Stopping...' : 'Stop & Generate CDR'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
