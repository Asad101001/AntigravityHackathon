import { useState } from 'react';
import axios from 'axios';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './LoginPage.css';

function LoginPage({ onLogin, apiBaseUrl }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/admin-login`, { email, password });
      if (response.data.success) {
        onLogin(response.data.token, response.data.user);
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please check the backend is running.');
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <div className="login-box">
        {/* Brand mark */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Shield size={28} strokeWidth={1.5} />
          </div>
          <h1>Asaaniyat Admin</h1>
          <p className="subtitle">Sign in to your dashboard</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={15} strokeWidth={2} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <div className="input-wrap">
              <span className="input-icon"><Mail size={16} strokeWidth={1.75} /></span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@asaaniyat.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={16} strokeWidth={1.75} /></span>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw(s => !s)}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><span className="btn-spinner" /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <div className="login-footer">
          <div className="demo-credentials">
            <span className="demo-label">Demo credentials</span>
            <div className="demo-row"><span>Email</span><code>admin@asaaniyat.com</code></div>
            <div className="demo-row"><span>Password</span><code>AdminPassword123</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
