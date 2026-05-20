import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, MapPin } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Analytics.css';

function Analytics({ auth, apiBaseUrl }) {
  const [bookingsByDay, setBookingsByDay] = useState([]);
  const [serviceTypes, setServiceTypes]   = useState([]);
  const [topCities, setTopCities]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [dayRes, serviceRes, cityRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/admin/analytics/bookings-by-day`,  { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get(`${apiBaseUrl}/api/admin/analytics/service-types`,    { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get(`${apiBaseUrl}/api/admin/analytics/top-cities`,       { headers: { Authorization: `Bearer ${auth.token}` } }),
      ]);
      if (dayRes.data.success)     setBookingsByDay(dayRes.data.data);
      if (serviceRes.data.success) setServiceTypes(serviceRes.data.data);
      if (cityRes.data.success)    setTopCities(cityRes.data.data);
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-spinner" />
        <span>Loading analytics…</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          {label && <p className="tooltip-label">{label}</p>}
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color }}>
              {entry.name}: <strong>{entry.value?.toLocaleString()}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Analytics &amp; Insights</h2>
          <p className="page-subtitle">Platform performance trends and breakdowns</p>
        </div>
      </div>

      {error && (
        <div className="page-error">
          <AlertCircle size={16} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      <div className="charts-grid">
        {/* Bookings over time */}
        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">Bookings Over Time <span className="chart-subtitle">Last 30 days</span></h3>
          {bookingsByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={bookingsByDay} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,143,70,0.08)" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="count"   stroke="#0E8F46" strokeWidth={2.5} dot={false} name="Bookings" />
                <Line type="monotone" dataKey="revenue" stroke="#2F80ED" strokeWidth={2} dot={false} name="Revenue (PKR)" yAxisId="right" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No data available</p>
          )}
        </div>

        {/* Bookings by service type */}
        <div className="chart-card">
          <h3 className="chart-title">By Service Type</h3>
          {serviceTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serviceTypes} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,143,70,0.08)" />
                <XAxis dataKey="_id" angle={-35} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="count"   fill="#0E8F46" name="Bookings" radius={[4,4,0,0]} />
                <Bar dataKey="revenue" fill="#764ba2" name="Revenue (PKR)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No data available</p>
          )}
        </div>

        {/* Top cities */}
        <div className="chart-card">
          <h3 className="chart-title">
            <MapPin size={14} strokeWidth={2} style={{ marginRight: 4, flexShrink: 0 }} />
            Top Cities
          </h3>
          <div className="city-list">
            {topCities.length > 0 ? topCities.map((city, index) => (
              <div key={index} className="city-item">
                <div className="city-rank">#{index + 1}</div>
                <div className="city-info">
                  <span className="city-name">{city._id || '—'}</span>
                  <span className="city-count">{city.count} booking{city.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="city-revenue">PKR {(city.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
              </div>
            )) : (
              <p className="chart-empty">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
