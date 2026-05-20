import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import StatCard from '../components/StatCard';
import './Dashboard.css';

function Dashboard({ auth, apiBaseUrl }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching dashboard stats from:', `${apiBaseUrl}/api/admin/dashboard-stats`);
      const response = await axios.get(`${apiBaseUrl}/api/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      console.log('Dashboard stats response:', response.data);
      if (response.data.success) {
        setStats(response.data.stats);
      } else {
        setError(response.data.error || 'Failed to load stats');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load dashboard stats';
      setError(errorMsg);
      console.error('Full error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-spinner" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <AlertCircle size={20} strokeWidth={1.75} />
        <span>{error}</span>
        <button className="btn-retry" onClick={fetchStats}>
          <RefreshCw size={14} strokeWidth={2} /> Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-error">
        <AlertCircle size={20} strokeWidth={1.75} />
        <span>No data available</span>
      </div>
    );
  }

  const statusColors = {
    pending:   '#D97706',
    confirmed: '#2F80ED',
    completed: '#0E8F46',
    cancelled: '#DC2626',
  };

  const statusData = Object.entries(stats.bookingsByStatus || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    fill: statusColors[status] || '#9C27B0'
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          {label && <p className="tooltip-label">{label}</p>}
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color || entry.fill }}>
              {entry.name}: <strong>{entry.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      {/* Page title */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard Overview</h2>
          <p className="page-subtitle">Real-time platform performance metrics</p>
        </div>
        <button className="btn-refresh" onClick={fetchStats} title="Refresh">
          <RefreshCw size={15} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers?.toLocaleString()}
          iconKey="users"
          color="#667eea"
          trend={12.5}
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings?.toLocaleString()}
          iconKey="bookings"
          color="#764ba2"
          trend={24.1}
        />
        <StatCard
          title="Active Users (30d)"
          value={stats.activeUsers?.toLocaleString()}
          iconKey="active"
          color="#0E8F46"
          trend={8.4}
        />
        <StatCard
          title="Total Revenue"
          value={`PKR ${(stats.revenue?.totalAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          iconKey="revenue"
          color="#2F80ED"
          trend={15.2}
        />
      </div>

      {/* Charts */}
      <div className="charts-container">
        <div className="chart-card">
          <h3 className="chart-title">Bookings by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={90}
                  innerRadius={40}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No booking data available</p>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Revenue Metrics <span className="chart-subtitle">PKR</span></h3>
          <div className="metrics-box">
            {[
              { label: 'Total',   val: stats.revenue?.totalAmount },
              { label: 'Average', val: stats.revenue?.avgAmount   },
              { label: 'Maximum', val: stats.revenue?.maxAmount   },
              { label: 'Minimum', val: stats.revenue?.minAmount   },
            ].map(({ label, val }) => (
              <div className="metric-item" key={label}>
                <span className="metric-label">{label}</span>
                <span className="metric-value">
                  {val != null ? val.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="recent-bookings">
        <h3 className="chart-title">Recent Bookings</h3>
        {stats.recentBookings && stats.recentBookings.length > 0 ? (
          <div className="bookings-table">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>User</th>
                  <th>Service</th>
                  <th>Amount (PKR)</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.slice(0, 5).map((booking) => (
                  <tr key={booking._id}>
                    <td><code className="mono-id">{booking._id?.slice(-8)}</code></td>
                    <td>{booking.user_name || <code className="mono-id">{booking.user_id?.slice(-8)}</code>}</td>
                    <td>{booking.service_type || 'N/A'}</td>
                    <td className="amount-cell">{(booking.quote_pkr || booking.amount_pkr || 0).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${booking.status}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="date-cell">
                      {booking.created_at || booking.createdAt 
                        ? new Date(booking.created_at || booking.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="chart-empty">No recent bookings</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
