import {
  User, Mail, Shield, Server, Database,
  BarChart3, Users, CalendarCheck, MapPin, Wrench, CheckCircle
} from 'lucide-react';
import './Settings.css';

const FEATURES = [
  { Icon: Users,         label: 'User Management'        },
  { Icon: BarChart3,     label: 'Booking Analytics'       },
  { Icon: CheckCircle,   label: 'Revenue Tracking'        },
  { Icon: MapPin,        label: 'City-wise Analytics'     },
  { Icon: Wrench,        label: 'Service Type Insights'   },
  { Icon: Shield,        label: 'Admin Role Management'   },
];

const STACK = [
  { Icon: Server,        label: 'Frontend',  value: 'React 19 + Vite'  },
  { Icon: BarChart3,     label: 'Charts',    value: 'Recharts'          },
  { Icon: Server,        label: 'Backend',   value: 'Express.js'        },
  { Icon: Database,      label: 'Database',  value: 'MongoDB'           },
];

function Settings({ auth }) {
  return (
    <div className="settings-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Account and platform configuration</p>
        </div>
      </div>

      {/* Account card */}
      <div className="settings-card">
        <h3 className="settings-card-title">
          <User size={16} strokeWidth={1.75} />
          Account Information
        </h3>
        <div className="setting-item">
          <label>
            <Mail size={13} strokeWidth={2} />
            Email
          </label>
          <p>{auth.user.email}</p>
        </div>
        <div className="setting-item">
          <label>
            <User size={13} strokeWidth={2} />
            Display Name
          </label>
          <p>{auth.user.displayName || '—'}</p>
        </div>
        <div className="setting-item">
          <label>
            <Shield size={13} strokeWidth={2} />
            Account Status
          </label>
          <p><span className="status-chip status-chip-active">Active · Admin</span></p>
        </div>
      </div>

      {/* Dashboard info card */}
      <div className="settings-card">
        <h3 className="settings-card-title">
          <BarChart3 size={16} strokeWidth={1.75} />
          Dashboard Features
        </h3>
        <div className="features-grid">
          {FEATURES.map(({ Icon, label }) => (
            <div className="feature-item" key={label}>
              <span className="feature-icon"><Icon size={15} strokeWidth={1.75} /></span>
              <span className="feature-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stack card */}
      <div className="settings-card">
        <h3 className="settings-card-title">
          <Server size={16} strokeWidth={1.75} />
          Technology Stack
        </h3>
        <div className="stack-grid">
          {STACK.map(({ Icon, label, value }) => (
            <div className="stack-item" key={label}>
              <span className="stack-icon"><Icon size={14} strokeWidth={1.75} /></span>
              <div className="stack-info">
                <span className="stack-label">{label}</span>
                <span className="stack-value">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About card */}
      <div className="settings-card settings-card-about">
        <h3 className="settings-card-title">
          <Shield size={16} strokeWidth={1.75} />
          About Asaaniyat Admin
        </h3>
        <p className="about-text">
          This admin dashboard is integrated with the Asaaniyat backend API.
          It provides comprehensive real-time insights into bookings, users, and service metrics
          across Pakistan's on-demand service platform.
        </p>
        <div className="version-badge">v1.0.0</div>
      </div>
    </div>
  );
}

export default Settings;
