import { useState, useEffect } from 'react';

interface Session {
  id: string;
  session_id: string;
  start_date_time: string;
  end_date_time?: string;
  kwh: number;
  auth_id: string;
  auth_method: string;
  location_id: string;
  evse_uid: string;
  connector_id: string;
  currency: string;
  charging_periods: any[];
  total_cost?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'INVALID' | 'PENDING';
  last_updated: string;
}

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

interface Location {
  id: string;
  evses: { evse_id: string; connectors: { id: string }[] }[];
}

interface Props {
  apiBase: string;
}

export function SessionManager({ apiBase }: Props) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'cdrs' | 'simulate'>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cdrs, setCdrs] = useState<CDR[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedCdr, setExpandedCdr] = useState<string | null>(null);

  // Simulation form state
  const [simLocationId, setSimLocationId] = useState('');
  const [simEvseId, setSimEvseId] = useState('');
  const [simConnectorId, setSimConnectorId] = useState('');
  const [simAuthId, setSimAuthId] = useState('TEST-USER-001');
  const [simPowerKw, setSimPowerKw] = useState('50');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [meterKwh, setMeterKwh] = useState('0');
  const [simulating, setSimulating] = useState(false);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${apiBase}/admin/simulate/sessions`);
      const data = await response.json();
      setSessions(data.data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const fetchCdrs = async () => {
    try {
      const response = await fetch(`${apiBase}/admin/simulate/cdrs`);
      const data = await response.json();
      setCdrs(data.data || []);
    } catch (err) {
      console.error('Error fetching CDRs:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${apiBase}/ocpi/2.2.1/locations`);
      const data = await response.json();
      if (data.status_code === 1000) {
        setLocations(data.data || []);
        if (data.data?.length > 0) {
          const loc = data.data[0];
          setSimLocationId(loc.id);
          if (loc.evses?.length > 0) {
            setSimEvseId(loc.evses[0].evse_id);
            if (loc.evses[0].connectors?.length > 0) {
              setSimConnectorId(loc.evses[0].connectors[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchCdrs();
    fetchLocations();
  }, []);

  const handleStartCharging = async () => {
    if (!simLocationId || !simEvseId || !simConnectorId || !simAuthId) {
      setError('Please fill all fields');
      return;
    }

    setSimulating(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/admin/simulate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: simLocationId,
          evse_id: simEvseId,
          connector_id: simConnectorId,
          auth_id: simAuthId,
          power_kw: parseFloat(simPowerKw),
          auto_increment: false,
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setActiveSession(data.data);
        setMeterKwh('0');
        fetchSessions();
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
      const response = await fetch(`${apiBase}/admin/simulate/meter-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.session_id,
          kwh: parseFloat(meterKwh),
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setActiveSession(data.data);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleStopCharging = async () => {
    if (!activeSession) return;

    setSimulating(true);
    try {
      const response = await fetch(`${apiBase}/admin/simulate/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.session_id,
          final_kwh: parseFloat(meterKwh),
          generate_cdr: true,
          price_per_kwh: 0.35,
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setActiveSession(null);
        setMeterKwh('0');
        fetchSessions();
        fetchCdrs();
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setSimulating(false);
    }
  };

  const selectedLocation = locations.find(l => l.id === simLocationId);
  const selectedEvse = selectedLocation?.evses?.find(e => e.evse_id === simEvseId);

  const formatJson = (obj: any) => JSON.stringify(obj, null, 2);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: '#22c55e',
      COMPLETED: '#3b82f6',
      INVALID: '#ef4444',
      PENDING: '#f59e0b',
    };
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: colors[status] || '#6b7280' }}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="session-manager">
      <nav className="sub-tabs">
        <button 
          className={`sub-tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          ⚡ Sessions ({sessions.length})
        </button>
        <button 
          className={`sub-tab ${activeTab === 'cdrs' ? 'active' : ''}`}
          onClick={() => setActiveTab('cdrs')}
        >
          📄 CDRs ({cdrs.length})
        </button>
        <button 
          className={`sub-tab ${activeTab === 'simulate' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulate')}
        >
          🎮 Simulate
        </button>
      </nav>

      {error && <div className="error">{error}</div>}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="sessions-list">
          <div className="section-header">
            <h3>Charging Sessions</h3>
            <button onClick={fetchSessions} className="btn-small">🔄 Refresh</button>
          </div>

          {sessions.length === 0 ? (
            <div className="empty-state">
              <p>📭 No sessions yet</p>
              <p className="text-small">Start a charging simulation to create sessions</p>
            </div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className="session-card">
                <div 
                  className="session-header"
                  onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                >
                  <span className="session-id">{session.session_id}</span>
                  {getStatusBadge(session.status)}
                  <span className="session-kwh">{session.kwh.toFixed(2)} kWh</span>
                  <span className="session-location">{session.location_id}</span>
                  <span className="expand-icon">{expandedSession === session.id ? '▼' : '▶'}</span>
                </div>

                {expandedSession === session.id && (
                  <div className="session-details">
                    <div className="detail-grid">
                      <div><strong>Start:</strong> {new Date(session.start_date_time).toLocaleString()}</div>
                      <div><strong>End:</strong> {session.end_date_time ? new Date(session.end_date_time).toLocaleString() : '-'}</div>
                      <div><strong>Auth ID:</strong> {session.auth_id}</div>
                      <div><strong>Auth Method:</strong> {session.auth_method}</div>
                      <div><strong>EVSE:</strong> {session.evse_uid}</div>
                      <div><strong>Connector:</strong> {session.connector_id}</div>
                      <div><strong>Cost:</strong> {session.total_cost ? `€${session.total_cost.toFixed(2)}` : '-'}</div>
                    </div>
                    <div className="json-section">
                      <h4>Raw JSON</h4>
                      <pre className="json-viewer">{formatJson(session)}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* CDRs Tab */}
      {activeTab === 'cdrs' && (
        <div className="cdrs-list">
          <div className="section-header">
            <h3>Charge Detail Records</h3>
            <button onClick={fetchCdrs} className="btn-small">🔄 Refresh</button>
          </div>

          {cdrs.length === 0 ? (
            <div className="empty-state">
              <p>📭 No CDRs yet</p>
              <p className="text-small">Complete a charging session to generate CDRs</p>
            </div>
          ) : (
            cdrs.map(cdr => (
              <div key={cdr.id} className="cdr-card">
                <div 
                  className="cdr-header"
                  onClick={() => setExpandedCdr(expandedCdr === cdr.id ? null : cdr.id)}
                >
                  <span className="cdr-id">{cdr.cdr_id}</span>
                  <span className="cdr-energy">{cdr.total_energy.toFixed(2)} kWh</span>
                  <span className="cdr-cost">€{cdr.total_cost.excl_vat.toFixed(2)}</span>
                  <span className="cdr-date">{new Date(cdr.start_date_time).toLocaleDateString()}</span>
                  <span className="expand-icon">{expandedCdr === cdr.id ? '▼' : '▶'}</span>
                </div>

                {expandedCdr === cdr.id && (
                  <div className="cdr-details">
                    <div className="detail-grid">
                      <div><strong>Start:</strong> {new Date(cdr.start_date_time).toLocaleString()}</div>
                      <div><strong>End:</strong> {new Date(cdr.end_date_time).toLocaleString()}</div>
                      <div><strong>Duration:</strong> {Math.round(cdr.total_time / 60)} min</div>
                      <div><strong>Location:</strong> {cdr.location_id}</div>
                      <div><strong>EVSE:</strong> {cdr.evse_uid}</div>
                      <div><strong>Auth ID:</strong> {cdr.auth_id}</div>
                      <div><strong>Cost (excl VAT):</strong> €{cdr.total_cost.excl_vat.toFixed(2)}</div>
                      <div><strong>Cost (incl VAT):</strong> €{cdr.total_cost.incl_vat?.toFixed(2) || '-'}</div>
                    </div>
                    <div className="json-section">
                      <h4>Raw JSON</h4>
                      <pre className="json-viewer">{formatJson(cdr)}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Simulate Tab */}
      {activeTab === 'simulate' && (
        <div className="simulate-panel">
          {!activeSession ? (
            <div className="start-session-form">
              <h3>🚗 Start Charging Session</h3>
              
              <div className="form-group">
                <label>Location</label>
                <select 
                  value={simLocationId} 
                  onChange={(e) => {
                    setSimLocationId(e.target.value);
                    const loc = locations.find(l => l.id === e.target.value);
                    if (loc?.evses?.length) {
                      setSimEvseId(loc.evses[0].evse_id);
                      if (loc.evses[0].connectors?.length) {
                        setSimConnectorId(loc.evses[0].connectors[0].id);
                      }
                    }
                  }}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.id}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>EVSE</label>
                <select value={simEvseId} onChange={(e) => {
                  setSimEvseId(e.target.value);
                  const evse = selectedLocation?.evses?.find(ev => ev.evse_id === e.target.value);
                  if (evse?.connectors?.length) {
                    setSimConnectorId(evse.connectors[0].id);
                  }
                }}>
                  {selectedLocation?.evses?.map(evse => (
                    <option key={evse.evse_id} value={evse.evse_id}>{evse.evse_id}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Connector</label>
                <select value={simConnectorId} onChange={(e) => setSimConnectorId(e.target.value)}>
                  {selectedEvse?.connectors?.map(conn => (
                    <option key={conn.id} value={conn.id}>{conn.id}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Auth ID (User/Token)</label>
                <input 
                  type="text"
                  value={simAuthId}
                  onChange={(e) => setSimAuthId(e.target.value)}
                  placeholder="e.g., TEST-USER-001"
                />
              </div>

              <div className="form-group">
                <label>Power (kW)</label>
                <input 
                  type="number"
                  value={simPowerKw}
                  onChange={(e) => setSimPowerKw(e.target.value)}
                />
              </div>

              <button 
                className="btn btn-primary btn-large"
                onClick={handleStartCharging}
                disabled={simulating}
              >
                {simulating ? '⏳ Starting...' : '⚡ Start Charging'}
              </button>
            </div>
          ) : (
            <div className="active-session-panel">
              <h3>🔌 Active Session</h3>
              
              <div className="session-info-card">
                <div className="session-info-header">
                  <span className="session-id">{activeSession.session_id}</span>
                  {getStatusBadge(activeSession.status)}
                </div>
                
                <div className="session-metrics">
                  <div className="metric">
                    <span className="metric-value">{activeSession.kwh.toFixed(2)}</span>
                    <span className="metric-label">kWh</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">
                      {Math.round((Date.now() - new Date(activeSession.start_date_time).getTime()) / 60000)}
                    </span>
                    <span className="metric-label">min</span>
                  </div>
                </div>

                <div className="meter-controls">
                  <div className="form-group">
                    <label>Meter Value (kWh)</label>
                    <input 
                      type="number"
                      value={meterKwh}
                      onChange={(e) => setMeterKwh(e.target.value)}
                      step="0.1"
                    />
                  </div>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleUpdateMeter}
                    disabled={simulating}
                  >
                    {simulating ? '⏳' : '📊 Update Meter'}
                  </button>
                </div>

                <div className="quick-increments">
                  <span>Quick add:</span>
                  {[1, 5, 10, 25].map(val => (
                    <button 
                      key={val}
                      className="btn-tiny"
                      onClick={() => setMeterKwh((parseFloat(meterKwh) + val).toString())}
                    >
                      +{val} kWh
                    </button>
                  ))}
                </div>

                <button 
                  className="btn btn-danger btn-large"
                  onClick={handleStopCharging}
                  disabled={simulating}
                >
                  {simulating ? '⏳ Stopping...' : '🛑 Stop & Generate CDR'}
                </button>
              </div>

              <div className="json-section">
                <h4>Session JSON</h4>
                <pre className="json-viewer">{formatJson(activeSession)}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
