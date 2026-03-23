import { useState } from 'react';

interface Props {
  onAdminModeEntered: () => void;
}

export function AdminSetup({ onAdminModeEntered }: Props) {
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simple admin password (in production, use proper auth)
    if (adminPassword === 'admin') {
      localStorage.setItem('admin_mode', 'true');
      onAdminModeEntered();
    } else {
      setError('Invalid admin password');
      setAdminPassword('');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2>🔧 Admin Setup</h2>
      <p className="subtitle">Configure your virtual CPO before eMSPs connect</p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Admin Password</label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Enter admin password"
            autoFocus
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn btn-primary">
          Enter Admin Mode
        </button>
      </form>

      <div className="info-box">
        <h4>Admin Password</h4>
        <p>For demo: <code>admin</code></p>
        <p style={{ fontSize: '0.85rem', color: '#999' }}>
          In production, replace with proper authentication
        </p>
      </div>
    </div>
  );
}
