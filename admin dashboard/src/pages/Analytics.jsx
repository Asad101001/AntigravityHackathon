import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Analytics.css';

function Analytics({ auth, apiBaseUrl }) {
  const [bookingsByDay, setBookingsByDay] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [topCities, setTopCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [dayRes, serviceRes, cityRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/admin/analytics/bookings-by-day`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        axios.get(`${apiBaseUrl}/api/admin/analytics/service-types`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        axios.get(`${apiBaseUrl}/api/admin/analytics/top-cities`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        })
      ]);

      if (dayRes.data.success) setBookingsByDay(dayRes.data.data);
      if (serviceRes.data.success) setServiceTypes(serviceRes.data.data);
      if (cityRes.data.success) setTopCities(cityRes.data.data);
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-container">
      <h2>Analytics & Insights</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Bookings Over Time (Last 30 Days)</h3>
          {bookingsByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bookingsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#667eea"
                  name="Bookings"
                  dot={{ fill: '#667eea' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#764ba2"
                  name="Revenue (PKR)"
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>No data available</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Bookings by Service Type</h3>
          {serviceTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceTypes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#667eea" name="Bookings" />
                <Bar dataKey="revenue" fill="#764ba2" name="Revenue (PKR)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No data available</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Bookings by City</h3>
          <div className="city-list">
            {topCities.length > 0 ? (
              topCities.map((city, index) => (
                <div key={index} className="city-item">
                  <div className="city-info">
                    <span className="city-name">{city._id}</span>
                    <span className="city-count">{city.count} bookings</span>
                  </div>
                  <div className="city-revenue">
                    <span>PKR {city.revenue?.toFixed(0) || 0}</span>
                  </div>
                </div>
              ))
            ) : (
              <p>No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
