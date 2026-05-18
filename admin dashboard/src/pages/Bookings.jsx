import { useState, useEffect } from 'react';
import axios from 'axios';
import './Bookings.css';
import BookingDetailModal from '../components/BookingDetailModal';

function Bookings({ auth, apiBaseUrl }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchBookings(page, statusFilter);
  }, [page, statusFilter]);

  const fetchBookings = async (pageNum, status) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum,
        limit: 20,
        ...(status && { status })
      });
      const response = await axios.get(`${apiBaseUrl}/api/admin/bookings?${params}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (response.data.success) {
        setBookings(response.data.data.bookings);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      setError('Failed to load bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;

    try {
      const response = await axios.delete(`${apiBaseUrl}/api/admin/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (response.data.success) {
        setBookings(bookings.filter(b => b._id !== bookingId));
        setSelectedBooking(null);
      }
    } catch (err) {
      console.error('Error deleting booking:', err);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      // Update booking status via admin backend
      const updatedBooking = await axios.put(`${apiBaseUrl}/api/admin/bookings/${bookingId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      if (updatedBooking.data.success) {
        // Update local state
        const updated = bookings.map(b => 
          b._id === bookingId ? { ...b, status: newStatus, updatedAt: new Date() } : b
        );
        setBookings(updated);
        setSelectedBooking({ ...selectedBooking, status: newStatus, updatedAt: new Date() });
      }
    } catch (err) {
      console.error('Error updating booking:', err);
      alert('Failed to update booking status: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return <div className="bookings-loading">Loading bookings...</div>;
  }

  return (
    <div className="bookings-container">
      <h2>Bookings Management</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bookings-table-wrapper">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>User</th>
              <th>Service</th>
              <th>City</th>
              <th>Area</th>
              <th>Amount (PKR)</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking._id} className="booking-row">
                <td 
                  className="clickable" 
                  onClick={() => setSelectedBooking(booking)}
                  title="Click to view details"
                >
                  {booking._id?.slice(-8)}
                </td>
                <td>{booking.user_id?.slice(-8)}</td>
                <td>{booking.service_type || 'N/A'}</td>
                <td>{booking.city || 'N/A'}</td>
                <td>{booking.area || 'N/A'}</td>
                <td>PKR {booking.quote_pkr || booking.amount_pkr || 0}</td>
                <td>
                  <span className={`status-badge status-${booking.status}`}>
                    {booking.status}
                  </span>
                </td>
                <td>{formatDate(booking.created_at || booking.createdAt)}</td>
                <td>
                  <button
                    className="btn-view"
                    onClick={() => setSelectedBooking(booking)}
                    title="View details"
                  >
                    👁️ View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="btn-pagination"
        >
          Previous
        </button>
        <span className="page-info">
          Page {pagination.page} of {pagination.pages}
        </span>
        <button
          disabled={page === pagination.pages}
          onClick={() => setPage(page + 1)}
          className="btn-pagination"
        >
          Next
        </button>
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onDelete={handleDeleteBooking}
          onStatusUpdate={handleStatusUpdate}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

export default Bookings;
