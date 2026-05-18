import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Bookings from './pages/Bookings';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Check if user is logged in
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAuth({
          token,
          user: response.data.user
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('admin_token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (token, user) => {
    localStorage.setItem('admin_token', token);
    setAuth({
      token,
      user
    });
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAuth(null);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} apiBaseUrl={API_BASE_URL} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Asaaniyat Admin Dashboard</h1>
          <div className="header-right">
            <span className="user-info">
              {auth.user.displayName || auth.user.email}
            </span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="app-layout">
        <nav className="app-sidebar">
          <ul className="nav-menu">
            <li>
              <button
                className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('dashboard')}
              >
                📊 Dashboard
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${currentPage === 'users' ? 'active' : ''}`}
                onClick={() => setCurrentPage('users')}
              >
                👥 Users
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${currentPage === 'bookings' ? 'active' : ''}`}
                onClick={() => setCurrentPage('bookings')}
              >
                📅 Bookings
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${currentPage === 'analytics' ? 'active' : ''}`}
                onClick={() => setCurrentPage('analytics')}
              >
                📈 Analytics
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
                onClick={() => setCurrentPage('settings')}
              >
                ⚙️ Settings
              </button>
            </li>
          </ul>
        </nav>

        <main className="app-main">
          {currentPage === 'dashboard' && (
            <Dashboard auth={auth} apiBaseUrl={API_BASE_URL} />
          )}
          {currentPage === 'users' && (
            <Users auth={auth} apiBaseUrl={API_BASE_URL} />
          )}
          {currentPage === 'bookings' && (
            <Bookings auth={auth} apiBaseUrl={API_BASE_URL} />
          )}
          {currentPage === 'analytics' && (
            <Analytics auth={auth} apiBaseUrl={API_BASE_URL} />
          )}
          {currentPage === 'settings' && (
            <Settings auth={auth} apiBaseUrl={API_BASE_URL} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
