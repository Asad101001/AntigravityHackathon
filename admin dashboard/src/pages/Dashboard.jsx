import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import './Dashboard.css';

function Dashboard({ auth, apiBaseUrl }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
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
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  if (!stats) {
    return <div className="dashboard-error">No data available</div>;
  }

  const statusColors = {
    pending: '#FFA500',
    confirmed: '#4CAF50',
    completed: '#2196F3',
    cancelled: '#f44336'
  };

  const statusData = Object.entries(stats.bookingsByStatus || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    fill: statusColors[status] || '#9C27B0'
  }));

  return (
    <div className="dashboard-container">
      <h2>Dashboard Overview</h2>

      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="👥"
          color="#667eea"
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon="📅"
          color="#764ba2"
        />
        <StatCard
          title="Active Users (30d)"
          value={stats.activeUsers}
          icon="⚡"
          color="#f093fb"
        />
        <StatCard
          title="Total Revenue"
          value={`PKR ${stats.revenue.totalAmount?.toFixed(0) || 0}`}
          icon="💰"
          color="#4facfe"
        />
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>Bookings by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No booking data</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Revenue Metrics (PKR)</h3>
          <div className="metrics-box">
            <div className="metric-item">
              <span className="metric-label">Total:</span>
              <span className="metric-value">{stats.revenue.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Average:</span>
              <span className="metric-value">{stats.revenue.avgAmount?.toFixed(2)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Maximum:</span>
              <span className="metric-value">{stats.revenue.maxAmount?.toFixed(2)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Minimum:</span>
              <span className="metric-value">{stats.revenue.minAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="recent-bookings">
        <h3>Recent Bookings</h3>
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
                    <td>{booking._id?.slice(-8)}</td>
                    <td>{booking.user_id?.slice(-8)}</td>
                    <td>{booking.service_type || 'N/A'}</td>
                    <td>{booking.amount_pkr || 0}</td>
                    <td>
                      <span className={`status-badge status-${booking.status}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td>{new Date(booking.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No recent bookings</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
