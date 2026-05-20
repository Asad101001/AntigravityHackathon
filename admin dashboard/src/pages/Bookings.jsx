import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Filter, Eye, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import './Bookings.css';
import BookingDetailModal from '../components/BookingDetailModal';

function Bookings({ auth, apiBaseUrl }) {
  const [bookings, setBookings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [page, setPage]                   = useState(1);
  const [pagination, setPagination]       = useState({});
  const [statusFilter, setStatusFilter]   = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => { fetchBookings(page, statusFilter); }, [page, statusFilter]);

  const fetchBookings = async (pageNum, status) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pageNum, limit: 20, ...(status && { status }) });
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
        toast.success('Booking successfully deleted');
      }
    } catch (err) {
      toast.error('Error deleting booking');
      console.error('Error deleting booking:', err);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const updatedBooking = await axios.put(
        `${apiBaseUrl}/api/admin/bookings/${bookingId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      if (updatedBooking.data.success) {
        const updated = bookings.map(b =>
          b._id === bookingId ? { ...b, status: newStatus, updatedAt: new Date() } : b
        );
        setBookings(updated);
        setSelectedBooking({ ...selectedBooking, status: newStatus, updatedAt: new Date() });
        toast.success(`Booking marked as ${newStatus}`);
      }
    } catch (err) {
      console.error('Error updating booking:', err);
      toast.error('Failed to update booking status: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return '—';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-spinner" />
        <span>Loading bookings…</span>
      </div>
    );
  }

  return (
    <div className="bookings-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Bookings</h2>
          <p className="page-subtitle">{pagination.total ? `${pagination.total} total bookings` : 'All platform bookings'}</p>
        </div>
        <div className="toolbar">
          <span className="toolbar-icon"><Filter size={15} strokeWidth={2} /></span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="page-error">
          <AlertCircle size={16} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      <div className="bookings-table-wrapper">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>ID</th>
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
                  <code className="mono-id">{booking._id?.slice(-8)}</code>
                </td>
                <td><code className="mono-id">{booking.user_id?.slice(-8)}</code></td>
                <td>{booking.service_type || '—'}</td>
                <td>{booking.city || '—'}</td>
                <td>{booking.area || '—'}</td>
                <td className="amount-cell">{(booking.quote_pkr || booking.amount_pkr || 0).toLocaleString()}</td>
                <td>
                  <span className={`status-badge status-${booking.status}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="date-cell">{formatDate(booking.created_at || booking.createdAt)}</td>
                <td>
                  <button
                    className="btn-view"
                    onClick={() => setSelectedBooking(booking)}
                    title="View details"
                  >
                    <Eye size={13} strokeWidth={2} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-pagination">
            <ChevronLeft size={16} strokeWidth={2} /> Prev
          </button>
          <span className="page-info">Page {pagination.page} / {pagination.pages}</span>
          <button disabled={page === pagination.pages} onClick={() => setPage(page + 1)} className="btn-pagination">
            Next <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      )}

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
