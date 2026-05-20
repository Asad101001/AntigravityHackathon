import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Users, CalendarDays, BarChart3,
  Settings, LogOut, Shield, ChevronRight
} from 'lucide-react';
import './App.css';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import Bookings from './pages/Bookings';
import Analytics from './pages/Analytics';
import SettingsPage from './pages/Settings';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'users',     label: 'Users',      Icon: Users           },
  { id: 'bookings',  label: 'Bookings',   Icon: CalendarDays    },
  { id: 'analytics', label: 'Analytics',  Icon: BarChart3       },
  { id: 'settings',  label: 'Settings',   Icon: Settings        },
];

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageKey, setPageKey] = useState(0); // forces re-mount for transition

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://asaaniyat-backend-525519819889.asia-south1.run.app';

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAuth({ token, user: response.data.user });
      } catch {
        localStorage.removeItem('admin_token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (token, user) => {
    localStorage.setItem('admin_token', token);
    setAuth({ token, user });
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAuth(null);
    setCurrentPage('dashboard');
  };

  const navigate = (page) => {
    if (page === currentPage) return;
    setCurrentPage(page);
    setPageKey(k => k + 1);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-logo"><Shield size={36} strokeWidth={1.5} /></div>
        <div className="spinner" />
        <p>Authenticating…</p>
      </div>
    );
  }

  if (!auth) return <LoginPage onLogin={handleLogin} apiBaseUrl={API_BASE_URL} />;

  const displayName = auth.user.displayName || auth.user.email?.split('@')[0] || 'Admin';

  return (
    <div className="app-container">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <span className="brand-icon"><Shield size={20} strokeWidth={2} /></span>
            <h1 className="app-title">Asaaniyat <span>Admin</span></h1>
          </div>

          <div className="header-right">
            <div className="header-breadcrumb">
              <span className="breadcrumb-page">
                {NAV_ITEMS.find(n => n.id === currentPage)?.label}
              </span>
            </div>
            <div className="user-chip">
              <div className="user-avatar">{displayName[0].toUpperCase()}</div>
              <span className="user-name">{displayName}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={16} strokeWidth={2} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="app-layout">
        {/* ── Sidebar ── */}
        <nav className="app-sidebar">
          <div className="nav-label">Navigation</div>
          <ul className="nav-menu">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <li key={id}>
                <button
                  className={`nav-item ${currentPage === id ? 'active' : ''}`}
                  onClick={() => navigate(id)}
                >
                  <span className="nav-icon"><Icon size={18} strokeWidth={1.75} /></span>
                  <span className="nav-label-text">{label}</span>
                  {currentPage === id && (
                    <span className="nav-indicator"><ChevronRight size={14} strokeWidth={2.5} /></span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="sidebar-footer">
            <div className="sidebar-version">v1.0.0</div>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="app-main" key={pageKey}>
          {currentPage === 'dashboard' && <Dashboard auth={auth} apiBaseUrl={API_BASE_URL} />}
          {currentPage === 'users'     && <UsersPage auth={auth} apiBaseUrl={API_BASE_URL} />}
          {currentPage === 'bookings'  && <Bookings  auth={auth} apiBaseUrl={API_BASE_URL} />}
          {currentPage === 'analytics' && <Analytics auth={auth} apiBaseUrl={API_BASE_URL} />}
          {currentPage === 'settings'  && <SettingsPage auth={auth} apiBaseUrl={API_BASE_URL} />}
        </main>
      </div>
    </div>
  );
}

export default App;
