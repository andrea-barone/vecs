import { useState, useEffect } from 'react';
import './App.css';
import { LocationTable } from './components/LocationTable';
import { LocationDetail } from './components/LocationDetail';
import { LocationForm } from './components/LocationForm';
import { TariffTable } from './components/TariffTable';
import { TariffDetail } from './components/TariffDetail';
import { TariffForm } from './components/TariffForm';
import { SessionTable } from './components/SessionTable';
import { SessionDetail } from './components/SessionDetail';
import { CDRTable } from './components/CDRTable';
import { CDRDetail } from './components/CDRDetail';
import { ChargingSimulator } from './components/ChargingSimulator';
import { TokenTable } from './components/TokenTable';
import { TokenDetail } from './components/TokenDetail';
import { TokenForm } from './components/TokenForm';
import { EMSPTable } from './components/EMSPTable';
import { EMSPDetail } from './components/EMSPDetail';
import { AdminSetup } from './components/AdminSetup';
import { LogViewer } from './components/LogViewer';
import { Dashboard } from './components/Dashboard';
import { PushLogViewer } from './components/PushLogViewer';

type AppMode = 'welcome' | 'admin';
type View = 'list' | 'detail' | 'create';
type SessionsSubTab = 'sessions' | 'cdrs' | 'simulate';

export function App() {
  const [appMode, setAppMode] = useState<AppMode>('welcome');
  const [adminMode, setAdminMode] = useState<boolean>(localStorage.getItem('admin_mode') === 'true');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'locations' | 'tariffs' | 'sessions' | 'tokens' | 'emsps' | 'logs'>('dashboard');
  const [error, setError] = useState('');

  // Locations
  const [locations, setLocations] = useState<any[]>([]);
  const [locationView, setLocationView] = useState<View>('list');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // Tariffs
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [tariffView, setTariffView] = useState<View>('list');
  const [selectedTariff, setSelectedTariff] = useState<any>(null);

  // Sessions & CDRs
  const [sessions, setSessions] = useState<any[]>([]);
  const [cdrs, setCdrs] = useState<any[]>([]);
  const [sessionsSubTab, setSessionsSubTab] = useState<SessionsSubTab>('sessions');
  const [sessionView, setSessionView] = useState<View>('list');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [cdrView, setCdrView] = useState<View>('list');
  const [selectedCdr, setSelectedCdr] = useState<any>(null);

  // Tokens
  const [tokens, setTokens] = useState<any[]>([]);
  const [tokenView, setTokenView] = useState<View>('list');
  const [selectedToken, setSelectedToken] = useState<any>(null);

  // eMSPs
  const [emsps, setEmsps] = useState<any[]>([]);
  const [emspView, setEmspView] = useState<View>('list');
  const [selectedEmsp, setSelectedEmsp] = useState<any>(null);

  const API_BASE = import.meta.env.VITE_API_URL || '';

  useEffect(() => { if (adminMode) setAppMode('admin'); }, [adminMode]);

  // Fetch functions
  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/ocpi/2.2.1/locations`, { cache: 'no-store' });
      const data = await res.json();
      if (data.status_code === 1000) {
        const locs = Array.isArray(data.data) ? data.data : [data.data];
        setLocations(locs);
        if (selectedLocation) {
          const updated = locs.find((l: any) => l.id === selectedLocation.id);
          if (updated) setSelectedLocation(updated);
        }
      }
    } catch (err) { setError(`Error: ${err}`); }
  };

  const fetchTariffs = async () => {
    try {
      const res = await fetch(`${API_BASE}/ocpi/2.2.1/tariffs`, { cache: 'no-store' });
      const data = await res.json();
      if (data.status_code === 1000) {
        setTariffs(data.data || []);
        if (selectedTariff) {
          const updated = (data.data || []).find((t: any) => t.id === selectedTariff.id);
          if (updated) setSelectedTariff(updated);
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/simulate/sessions`, { cache: 'no-store' });
      const data = await res.json();
      setSessions(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchCdrs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/simulate/cdrs`, { cache: 'no-store' });
      const data = await res.json();
      setCdrs(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchTokens = async () => {
    try {
      const res = await fetch(`${API_BASE}/ocpi/2.2.1/tokens`, { cache: 'no-store' });
      const data = await res.json();
      if (data.status_code === 1000) {
        setTokens(data.data || []);
        if (selectedToken) {
          const updated = (data.data || []).find((t: any) => t.uid === selectedToken.uid);
          if (updated) setSelectedToken(updated);
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchEmsps = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/emsps`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.error) {
        setEmsps(data.data || []);
        if (selectedEmsp) {
          const updated = (data.data || []).find((e: any) => e.id === selectedEmsp.id);
          if (updated) setSelectedEmsp(updated);
        }
      }
    } catch (err) { console.error(err); }
  };

  const createSampleTokens = async () => {
    try {
      await fetch(`${API_BASE}/ocpi/2.2.1/tokens/samples`, { method: 'POST' });
      fetchTokens();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (appMode === 'admin' && adminMode) {
      fetchLocations();
      fetchTariffs();
      fetchSessions();
      fetchCdrs();
      fetchTokens();
      fetchEmsps();
    }
  }, [appMode, adminMode]);

  const handleAdminModeEntered = () => { setAdminMode(true); setAppMode('admin'); };
  const handleExitAdmin = () => { setAdminMode(false); localStorage.removeItem('admin_mode'); setAppMode('welcome'); };

  const resetViews = () => {
    setLocationView('list'); setSelectedLocation(null);
    setTariffView('list'); setSelectedTariff(null);
    setSessionView('list'); setSelectedSession(null);
    setCdrView('list'); setSelectedCdr(null);
    setTokenView('list'); setSelectedToken(null);
    setEmspView('list'); setSelectedEmsp(null);
  };

  return (
    <div className="app">
      {appMode === 'admin' && adminMode && (
        <header className="header">
          <h1>⚡ VECS</h1>
          <p className="subtitle">Virtual Electric Charging Station Simulator</p>
          <div className="auth-status">
            <span className="token-badge">Admin Mode</span>
            <button onClick={handleExitAdmin} className="logout-btn">Exit</button>
          </div>
        </header>
      )}

      {appMode === 'welcome' && (
        <div className="welcome-container">
          <div className="welcome-card-centered" onClick={() => setAppMode('admin')}>
            <div className="welcome-icon">⚡</div>
            <h2>VECS Admin</h2>
            <p>Virtual Electric Charging Station Simulator</p>
            <p className="welcome-subtitle">OCPI 2.2.1 CPO for testing eMSP integrations</p>
            <button className="btn btn-primary btn-large">Enter Dashboard →</button>
          </div>
        </div>
      )}

      {appMode === 'admin' && (
        <>
          {!adminMode ? (
            <div className="container"><AdminSetup onAdminModeEntered={handleAdminModeEntered} /></div>
          ) : (
            <div className="container">
              <nav className="tabs">
                <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); resetViews(); }}>Dashboard</button>
                <button className={`tab ${activeTab === 'locations' ? 'active' : ''}`} onClick={() => { setActiveTab('locations'); resetViews(); }}>Locations</button>
                <button className={`tab ${activeTab === 'tariffs' ? 'active' : ''}`} onClick={() => { setActiveTab('tariffs'); resetViews(); }}>Tariffs</button>
                <button className={`tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => { setActiveTab('sessions'); resetViews(); }}>Sessions</button>
                <button className={`tab ${activeTab === 'tokens' ? 'active' : ''}`} onClick={() => { setActiveTab('tokens'); resetViews(); }}>Tokens</button>
                <button className={`tab ${activeTab === 'emsps' ? 'active' : ''}`} onClick={() => { setActiveTab('emsps'); resetViews(); }}>eMSPs</button>
                <button className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { setActiveTab('logs'); resetViews(); }}>Logs</button>
              </nav>

              {error && <div className="error">{error}</div>}

              {/* Dashboard */}
              {activeTab === 'dashboard' && <section className="section"><Dashboard apiBase={API_BASE} /></section>}

              {/* Locations */}
              {activeTab === 'locations' && (
                <section className="section">
                  {locationView === 'list' && <LocationTable locations={locations} onSelectLocation={l => { setSelectedLocation(l); setLocationView('detail'); }} onCreateNew={() => setLocationView('create')} />}
                  {locationView === 'detail' && selectedLocation && <LocationDetail location={selectedLocation} apiBase={API_BASE} onBack={() => { setLocationView('list'); setSelectedLocation(null); }} onLocationUpdated={fetchLocations} />}
                  {locationView === 'create' && (
                    <div className="detail-page">
                      <div className="detail-header">
                        <button className="btn btn-secondary" onClick={() => setLocationView('list')}>← Back</button>
                        <div className="detail-title"><h2>Create Location</h2></div>
                      </div>
                      <div className="detail-content">
                        <LocationForm apiBase={API_BASE} onLocationCreated={() => { fetchLocations(); setLocationView('list'); }} />
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Tariffs */}
              {activeTab === 'tariffs' && (
                <section className="section">
                  {tariffView === 'list' && <TariffTable tariffs={tariffs} onSelectTariff={t => { setSelectedTariff(t); setTariffView('detail'); }} onCreateNew={() => setTariffView('create')} />}
                  {tariffView === 'detail' && selectedTariff && <TariffDetail tariff={selectedTariff} apiBase={API_BASE} onBack={() => { setTariffView('list'); setSelectedTariff(null); }} onUpdated={fetchTariffs} />}
                  {tariffView === 'create' && <TariffForm apiBase={API_BASE} onBack={() => setTariffView('list')} onCreated={fetchTariffs} />}
                </section>
              )}

              {/* Sessions & CDRs */}
              {activeTab === 'sessions' && (
                <section className="section">
                  <nav className="sub-tabs">
                    <button className={`sub-tab ${sessionsSubTab === 'sessions' ? 'active' : ''}`} onClick={() => { setSessionsSubTab('sessions'); setSessionView('list'); }}>Sessions ({sessions.length})</button>
                    <button className={`sub-tab ${sessionsSubTab === 'cdrs' ? 'active' : ''}`} onClick={() => { setSessionsSubTab('cdrs'); setCdrView('list'); }}>CDRs ({cdrs.length})</button>
                    <button className={`sub-tab ${sessionsSubTab === 'simulate' ? 'active' : ''}`} onClick={() => setSessionsSubTab('simulate')}>Simulate</button>
                  </nav>

                  {sessionsSubTab === 'sessions' && (
                    <>
                      {sessionView === 'list' && <SessionTable sessions={sessions} onSelectSession={s => { setSelectedSession(s); setSessionView('detail'); }} onRefresh={fetchSessions} />}
                      {sessionView === 'detail' && selectedSession && <SessionDetail session={selectedSession} onBack={() => { setSessionView('list'); setSelectedSession(null); }} />}
                    </>
                  )}

                  {sessionsSubTab === 'cdrs' && (
                    <>
                      {cdrView === 'list' && <CDRTable cdrs={cdrs} onSelectCDR={c => { setSelectedCdr(c); setCdrView('detail'); }} onRefresh={fetchCdrs} />}
                      {cdrView === 'detail' && selectedCdr && <CDRDetail cdr={selectedCdr} onBack={() => { setCdrView('list'); setSelectedCdr(null); }} />}
                    </>
                  )}

                  {sessionsSubTab === 'simulate' && <ChargingSimulator apiBase={API_BASE} onSessionChanged={() => { fetchSessions(); fetchCdrs(); }} />}
                </section>
              )}

              {/* Tokens */}
              {activeTab === 'tokens' && (
                <section className="section">
                  {tokenView === 'list' && <TokenTable tokens={tokens} onSelectToken={t => { setSelectedToken(t); setTokenView('detail'); }} onCreateNew={() => setTokenView('create')} onCreateSamples={createSampleTokens} />}
                  {tokenView === 'detail' && selectedToken && <TokenDetail token={selectedToken} apiBase={API_BASE} onBack={() => { setTokenView('list'); setSelectedToken(null); }} onUpdated={fetchTokens} />}
                  {tokenView === 'create' && <TokenForm apiBase={API_BASE} onBack={() => setTokenView('list')} onCreated={fetchTokens} />}
                </section>
              )}

              {/* eMSPs */}
              {activeTab === 'emsps' && (
                <section className="section">
                  {emspView === 'list' && <EMSPTable emsps={emsps} onSelectEMSP={e => { setSelectedEmsp(e); setEmspView('detail'); }} onRefresh={fetchEmsps} />}
                  {emspView === 'detail' && selectedEmsp && <EMSPDetail emsp={selectedEmsp} apiBase={API_BASE} onBack={() => { setEmspView('list'); setSelectedEmsp(null); }} onUpdated={fetchEmsps} />}
                </section>
              )}

              {/* Logs */}
              {activeTab === 'logs' && (
                <section className="section">
                  <LogViewer apiBase={API_BASE} />
                  <div style={{ marginTop: '2rem' }}><PushLogViewer apiBase={API_BASE} /></div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
