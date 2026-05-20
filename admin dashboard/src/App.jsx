import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import {
  LayoutDashboard, Users, CalendarDays, BarChart3,
  Info, LogOut, Shield, ChevronRight, Menu, X
} from 'lucide-react';
import './App.css';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import Bookings from './pages/Bookings';
import Analytics from './pages/Analytics';
import SettingsPage from './pages/Settings';

const NAV_ITEMS = [
  { id: 'dashboard', path: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'users',     path: '/users',      label: 'Users',      Icon: Users           },
  { id: 'bookings',  path: '/bookings',   label: 'Bookings',   Icon: CalendarDays    },
  { id: 'analytics', path: '/analytics',  label: 'Analytics',  Icon: BarChart3       },
  { id: 'settings',  path: '/about',      label: 'About',      Icon: Info            },
];

function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://asaaniyat-backend-525519819889.asia-south1.run.app';

  useEffect(() => { checkAuth(); }, []);
  
  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
    toast.success('Successfully logged in');
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAuth(null);
    toast('Logged out successfully', { icon: '👋' });
    navigate('/');
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
  const currentNav = NAV_ITEMS.find(n => n.path === location.pathname) || NAV_ITEMS[0];

  return (
    <div className="app-container">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="brand-icon"><Shield size={20} strokeWidth={2} /></span>
            <h1 className="app-title">Asaaniyat <span>Admin</span></h1>
          </div>

          <div className="header-right">
            <div className="header-breadcrumb">
              <span className="breadcrumb-page">
                {currentNav.label}
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
        <nav className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <ul className="nav-menu">
            {NAV_ITEMS.map(({ id, path, label, Icon }) => (
              <li key={id}>
                <NavLink
                  to={path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon"><Icon size={18} strokeWidth={1.75} /></span>
                  <span className="nav-label-text">{label}</span>
                  {location.pathname === path && (
                    <span className="nav-indicator"><ChevronRight size={14} strokeWidth={2.5} /></span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="sidebar-footer">
            <div className="sidebar-version">v1.0.0</div>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="app-main" key={location.pathname}>
          <div className="main-content-scroll">
            <Routes>
              <Route path="/" element={<Dashboard auth={auth} apiBaseUrl={API_BASE_URL} />} />
              <Route path="/users" element={<UsersPage auth={auth} apiBaseUrl={API_BASE_URL} />} />
              <Route path="/bookings" element={<Bookings auth={auth} apiBaseUrl={API_BASE_URL} />} />
              <Route path="/analytics" element={<Analytics auth={auth} apiBaseUrl={API_BASE_URL} />} />
              <Route path="/about" element={<SettingsPage auth={auth} apiBaseUrl={API_BASE_URL} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <footer className="app-footer">
            <p>Asaaniyat Admin System &copy; {new Date().getFullYear()}. All rights reserved.</p>
          </footer>
        </main>
      </div>
      
      <Toaster position="top-right" toastOptions={{
        style: { background: '#fff', color: '#333', fontSize: '0.85rem', fontWeight: 600, borderRadius: '8px' },
        success: { iconTheme: { primary: '#0E8F46', secondary: '#fff' } }
      }} />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}
    </div>
  );
}

export default App;
