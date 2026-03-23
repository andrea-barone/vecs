import { useState, useEffect } from 'react';
import './App.css';
import { CredentialsForm } from './components/CredentialsForm';
import { LocationList } from './components/LocationList';
import { LocationForm } from './components/LocationForm';
import { EVSEForm } from './components/EVSEForm';
import { AdminSetup } from './components/AdminSetup';
import { TariffManager } from './components/TariffManager';
import { LogViewer } from './components/LogViewer';
import { SessionManager } from './components/SessionManager';
import { TokenManager } from './components/TokenManager';

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
  time_zone?: string;
  charging_when_closed?: boolean;
  evses: any[];
  last_updated?: string;
}

type AppMode = 'welcome' | 'admin' | 'emsp';

export function App() {
  const [appMode, setAppMode] = useState<AppMode>('welcome');
  const [token, setToken] = useState<string>(localStorage.getItem('ocpi_token') || '');
  const [adminMode, setAdminMode] = useState<boolean>(localStorage.getItem('admin_mode') === 'true');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'locations' | 'create' | 'tariffs' | 'sessions' | 'tokens' | 'logs'>('locations');

  // Use relative paths for API calls (works through nginx proxy in Docker)
  // Falls back to VITE_API_URL for dev server with proxy setup
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Initialize mode on load
  useEffect(() => {
    if (adminMode) {
      setAppMode('admin');
    } else if (token) {
      setAppMode('emsp');
    }
  }, [adminMode, token]);

  // Fetch locations (works for both admin and eMSP)
  const fetchLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      // Add token if we have one (eMSP mode)
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`${API_BASE}/ocpi/2.2.1/locations`, { headers });
      const data = await response.json();
      if (data.status_code === 1000) {
        setLocations(Array.isArray(data.data) ? data.data : [data.data]);
      } else {
        setError(data.status_message || 'Failed to fetch locations');
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appMode === 'admin' || appMode === 'emsp') {
      fetchLocations();
    }
  }, [appMode, token]);

  const handleCredentialsCreated = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('ocpi_token', newToken);
    setAppMode('emsp');
    setActiveTab('locations');
  };

  const handleAdminModeEntered = () => {
    setAdminMode(true);
    setAppMode('admin');
    fetchLocations();
  };

  const handleLocationCreated = () => {
    fetchLocations();
    setActiveTab('locations');
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('ocpi_token');
    setLocations([]);
    setAppMode('welcome');
  };

  const handleExitAdmin = () => {
    setAdminMode(false);
    localStorage.removeItem('admin_mode');
    setLocations([]);
    setAppMode('welcome');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔌 VECS</h1>
        <p className="subtitle">Virtual Electric Charging Station Simulator</p>
        {appMode === 'emsp' && token && (
          <div className="auth-status">
            <span className="token-badge">eMSP: {token.substring(0, 20)}...</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        )}
        {appMode === 'admin' && (
          <div className="auth-status">
            <span className="token-badge">🔧 Admin Mode</span>
            <button onClick={handleExitAdmin} className="logout-btn">
              Exit Admin
            </button>
          </div>
        )}
      </header>

      {/* Welcome Screen */}
      {appMode === 'welcome' && (
        <div className="container">
          <div className="welcome-grid">
            <div className="welcome-card" onClick={() => setAppMode('admin')}>
              <div className="welcome-icon">🔧</div>
              <h2>Admin Setup</h2>
              <p>Configure your virtual CPO</p>
              <ul>
                <li>Create charging locations</li>
                <li>Add EVSEs & connectors</li>
                <li>Set up your network</li>
                <li>Then let eMSPs connect</li>
              </ul>
              <button className="btn btn-primary">Enter Admin Mode →</button>
            </div>

            <div className="welcome-card" onClick={() => setAppMode('emsp')}>
              <div className="welcome-icon">🚗</div>
              <h2>eMSP Connection</h2>
              <p>Connect as Mobility Provider</p>
              <ul>
                <li>Register your eMSP</li>
                <li>Get API credentials</li>
                <li>Access charging network</li>
                <li>Manage your fleet</li>
              </ul>
              <button className="btn btn-secondary">Register eMSP →</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Mode */}
      {appMode === 'admin' && (
        <>
          {!adminMode ? (
            <div className="container">
              <AdminSetup onAdminModeEntered={handleAdminModeEntered} />
            </div>
          ) : (
            <div className="container">
              <nav className="tabs">
                <button
                  className={`tab ${activeTab === 'locations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('locations')}
                >
                  📍 Locations
                </button>
                <button
                  className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create')}
                >
                  ➕ Create
                </button>
                <button
                  className={`tab ${activeTab === 'tariffs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tariffs')}
                >
                  💰 Tariffs
                </button>
                <button
                  className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sessions')}
                >
                  ⚡ Sessions
                </button>
                <button
                  className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tokens')}
                >
                  🔑 Tokens
                </button>
                <button
                  className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  📋 Logs
                </button>
              </nav>

              {activeTab === 'tariffs' && (
                <section className="section">
                  <TariffManager apiBase={API_BASE} />
                </section>
              )}

              {activeTab === 'sessions' && (
                <section className="section">
                  <SessionManager apiBase={API_BASE} />
                </section>
              )}

              {activeTab === 'tokens' && (
                <section className="section">
                  <TokenManager apiBase={API_BASE} />
                </section>
              )}

              {activeTab === 'logs' && (
                <section className="section">
                  <LogViewer apiBase={API_BASE} />
                </section>
              )}

              {activeTab === 'locations' && (
                <section className="section">
                  <div className="section-header">
                    <h2>Charging Locations</h2>
                    <button onClick={fetchLocations} disabled={loading} className="refresh-btn">
                      {loading ? '🔄 Loading...' : '🔄 Refresh'}
                    </button>
                  </div>
                  {error && <div className="error">{error}</div>}
                  <LocationList
                    locations={locations}
                    apiBase={API_BASE}
                    token={token}
                    selectedLocation={selectedLocation}
                    onSelectLocation={setSelectedLocation}
                    onLocationUpdated={fetchLocations}
                  />
                </section>
              )}

              {activeTab === 'create' && (
                <section className="section">
                  <h2>Create New Location</h2>
                  <LocationForm apiBase={API_BASE} onLocationCreated={handleLocationCreated} />

                  {selectedLocation && (
                    <>
                      <h3 style={{ marginTop: '2rem' }}>Add EVSE to {selectedLocation}</h3>
                      <EVSEForm
                        apiBase={API_BASE}
                        locationId={selectedLocation}
                        onEVSECreated={() => {
                          fetchLocations();
                          setSelectedLocation(null);
                        }}
                      />
                    </>
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* eMSP Mode */}
      {appMode === 'emsp' && (
        <div className="container">
          {!token ? (
            <CredentialsForm apiBase={API_BASE} onCredentialsCreated={handleCredentialsCreated} />
          ) : (
            <>
              <nav className="tabs">
                <button
                  className={`tab ${activeTab === 'locations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('locations')}
                >
                  📍 Locations
                </button>
                <button
                  className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create')}
                >
                  ➕ Create
                </button>
              </nav>

              {activeTab === 'locations' && (
                <section className="section">
                  <div className="section-header">
                    <h2>Charging Locations</h2>
                    <button onClick={fetchLocations} disabled={loading} className="refresh-btn">
                      {loading ? '🔄 Loading...' : '🔄 Refresh'}
                    </button>
                  </div>
                  {error && <div className="error">{error}</div>}
                  <LocationList
                    locations={locations}
                    apiBase={API_BASE}
                    token={token}
                    selectedLocation={selectedLocation}
                    onSelectLocation={setSelectedLocation}
                    onLocationUpdated={fetchLocations}
                  />
                </section>
              )}

              {activeTab === 'create' && (
                <section className="section">
                  <h2>Create New Location</h2>
                  <LocationForm apiBase={API_BASE} onLocationCreated={handleLocationCreated} />

                  {selectedLocation && (
                    <>
                      <h3 style={{ marginTop: '2rem' }}>Add EVSE to {selectedLocation}</h3>
                      <EVSEForm
                        apiBase={API_BASE}
                        locationId={selectedLocation}
                        onEVSECreated={() => {
                          fetchLocations();
                          setSelectedLocation(null);
                        }}
                      />
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
