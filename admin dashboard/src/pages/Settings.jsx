import './Settings.css';

function Settings({ auth }) {
  return (
    <div className="settings-container">
      <h2>Settings</h2>

      <div className="settings-card">
        <h3>Account Information</h3>
        <div className="setting-item">
          <label>Email</label>
          <p>{auth.user.email}</p>
        </div>
        <div className="setting-item">
          <label>Display Name</label>
          <p>{auth.user.displayName}</p>
        </div>
        <div className="setting-item">
          <label>Account Status</label>
          <p>Active (Admin)</p>
        </div>
      </div>

      <div className="settings-card">
        <h3>Dashboard Information</h3>
        <div className="info-box">
          <p>
            <strong>Admin Dashboard Version:</strong> 1.0.0
          </p>
          <p>
            <strong>API Base URL:</strong> {window.location.origin.includes('localhost') ? 'http://localhost:3001' : 'Backend API'}
          </p>
          <p>
            <strong>Features:</strong>
            <ul>
              <li>✅ User Management</li>
              <li>✅ Booking Analytics</li>
              <li>✅ Revenue Tracking</li>
              <li>✅ City-wise Analytics</li>
              <li>✅ Service Type Insights</li>
              <li>✅ Admin Role Management</li>
            </ul>
          </p>
        </div>
      </div>

      <div className="settings-card">
        <h3>About</h3>
        <div className="info-box">
          <p>
            This admin dashboard is integrated with the Asaaniyat backend API.
            It provides comprehensive insights into bookings, users, and service metrics.
          </p>
          <p>
            <strong>Technology Stack:</strong>
            <ul>
              <li>Frontend: React 19 + Vite</li>
              <li>Charts: Recharts</li>
              <li>Backend: Express.js</li>
              <li>Database: MongoDB</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
