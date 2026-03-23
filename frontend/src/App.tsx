import { useState, useEffect } from 'react';
import './App.css';
import { CredentialsForm } from './components/CredentialsForm';
import { LocationList } from './components/LocationList';
import { LocationForm } from './components/LocationForm';
import { EVSEForm } from './components/EVSEForm';
import { ConnectorForm } from './components/ConnectorForm';

interface Location {
  id: string;
  address: string;
  city: string;
  country: string;
  evses: any[];
}

export function App() {
  const [token, setToken] = useState<string>(localStorage.getItem('ocpi_token') || '');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'auth' | 'locations' | 'create'>('auth');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (token) {
      fetchLocations();
    }
  }, [token]);

  const fetchLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/ocpi/2.2.1/locations`, {
        headers: { Authorization: `Token ${token}` },
      });
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

  const handleCredentialsCreated = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('ocpi_token', newToken);
    setActiveTab('locations');
  };

  const handleLocationCreated = () => {
    fetchLocations();
    setActiveTab('locations');
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('ocpi_token');
    setLocations([]);
    setActiveTab('auth');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔌 VECS</h1>
        <p className="subtitle">Virtual Electric Charging Station Simulator</p>
        {token && (
          <div className="auth-status">
            <span className="token-badge">Token: {token.substring(0, 20)}...</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        )}
      </header>

      {!token ? (
        <div className="container">
          <CredentialsForm apiBase={API_BASE} onCredentialsCreated={handleCredentialsCreated} />
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
        </div>
      )}
    </div>
  );
}

export default App;
