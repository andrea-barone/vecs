import { useState, useEffect } from 'react';
import './App.css';
import { LocationTable } from './components/LocationTable';
import { LocationDetail } from './components/LocationDetail';
import { LocationForm } from './components/LocationForm';
import { AdminSetup } from './components/AdminSetup';
import { TariffManager } from './components/TariffManager';
import { LogViewer } from './components/LogViewer';
import { SessionManager } from './components/SessionManager';
import { TokenManager } from './components/TokenManager';
import { Dashboard } from './components/Dashboard';
import { PushLogViewer } from './components/PushLogViewer';
import { EMSPManager } from './components/EMSPManager';

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

type AppMode = 'welcome' | 'admin';
type LocationView = 'list' | 'detail' | 'create';

export function App() {
  const [appMode, setAppMode] = useState<AppMode>('welcome');
  const [adminMode, setAdminMode] = useState<boolean>(localStorage.getItem('admin_mode') === 'true');
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'locations' | 'tariffs' | 'sessions' | 'tokens' | 'emsps' | 'logs'>('dashboard');
  
  // Location detail view state
  const [locationView, setLocationView] = useState<LocationView>('list');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (adminMode) {
      setAppMode('admin');
    }
  }, [adminMode]);

  const fetchLocations = async () => {
    setError('');
    try {
      const response = await fetch(`${API_BASE}/ocpi/2.2.1/locations`, { cache: 'no-store' });
      const data = await response.json();
      if (data.status_code === 1000) {
        const locs = Array.isArray(data.data) ? data.data : [data.data];
        setLocations(locs);
        // Update selected location if it exists
        if (selectedLocation) {
          const updated = locs.find((l: Location) => l.id === selectedLocation.id);
          if (updated) setSelectedLocation(updated);
        }
      } else {
        setError(data.status_message || 'Failed to fetch locations');
      }
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  useEffect(() => {
    if (appMode === 'admin' && adminMode) {
      fetchLocations();
    }
  }, [appMode, adminMode]);

  const handleAdminModeEntered = () => {
    setAdminMode(true);
    setAppMode('admin');
    fetchLocations();
  };

  const handleExitAdmin = () => {
    setAdminMode(false);
    localStorage.removeItem('admin_mode');
    setLocations([]);
    setAppMode('welcome');
  };

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
    setLocationView('detail');
  };

  const handleBackToList = () => {
    setSelectedLocation(null);
    setLocationView('list');
  };

  const handleLocationCreated = () => {
    fetchLocations();
    setLocationView('list');
  };

  return (
    <div className="app">
      {/* Header - only show when in admin mode */}
      {appMode === 'admin' && adminMode && (
        <header className="header">
          <h1>⚡ VECS</h1>
          <p className="subtitle">Virtual Electric Charging Station Simulator</p>
          <div className="auth-status">
            <span className="token-badge">Admin Mode</span>
            <button onClick={handleExitAdmin} className="logout-btn">
              Exit
            </button>
          </div>
        </header>
      )}

      {/* Welcome Screen */}
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
                  className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`tab ${activeTab === 'locations' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('locations'); setLocationView('list'); }}
                >
                  Locations
                </button>
                <button
                  className={`tab ${activeTab === 'tariffs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tariffs')}
                >
                  Tariffs
                </button>
                <button
                  className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sessions')}
                >
                  Sessions
                </button>
                <button
                  className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tokens')}
                >
                  Tokens
                </button>
                <button
                  className={`tab ${activeTab === 'emsps' ? 'active' : ''}`}
                  onClick={() => setActiveTab('emsps')}
                >
                  eMSPs
                </button>
                <button
                  className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  Logs
                </button>
              </nav>

              {activeTab === 'dashboard' && (
                <section className="section">
                  <Dashboard apiBase={API_BASE} />
                </section>
              )}

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

              {activeTab === 'emsps' && (
                <section className="section">
                  <EMSPManager apiBase={API_BASE} />
                </section>
              )}

              {activeTab === 'logs' && (
                <section className="section">
                  <LogViewer apiBase={API_BASE} />
                  <div style={{ marginTop: '2rem' }}>
                    <PushLogViewer apiBase={API_BASE} />
                  </div>
                </section>
              )}

              {activeTab === 'locations' && (
                <section className="section">
                  {error && <div className="error">{error}</div>}
                  
                  {locationView === 'list' && (
                    <LocationTable
                      locations={locations}
                      onSelectLocation={handleSelectLocation}
                      onCreateNew={() => setLocationView('create')}
                    />
                  )}

                  {locationView === 'detail' && selectedLocation && (
                    <LocationDetail
                      location={selectedLocation}
                      apiBase={API_BASE}
                      onBack={handleBackToList}
                      onLocationUpdated={fetchLocations}
                    />
                  )}

                  {locationView === 'create' && (
                    <div className="detail-page">
                      <div className="detail-header">
                        <button className="btn btn-secondary" onClick={() => setLocationView('list')}>← Back</button>
                        <div className="detail-title">
                          <h2>Create Location</h2>
                        </div>
                      </div>
                      <div className="detail-content">
                        <LocationForm apiBase={API_BASE} onLocationCreated={handleLocationCreated} />
                      </div>
                    </div>
                  )}
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
