import { useState } from 'react';
import './BookingDetailModal.css';

function BookingDetailModal({ booking, onClose, onDelete, onStatusUpdate, formatDate }) {
  const [selectedStatus, setSelectedStatus] = useState(booking.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async () => {
    if (selectedStatus === booking.status) {
      alert('Please select a different status');
      return;
    }
    
    if (window.confirm(`Update booking status to ${selectedStatus}?`)) {
      setIsUpdating(true);
      try {
        await onStatusUpdate(booking._id, selectedStatus);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      onDelete(booking._id);
    }
  };

  // Helper to get nested values
  const getValue = (obj, path, fallback = 'N/A') => {
    const value = path.split('.').reduce((current, prop) => current?.[prop], obj);
    return value && value !== '' ? value : fallback;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>Booking Details</h2>
          <p className="booking-id">ID: {booking._id}</p>
        </div>

        <div className="modal-body">
          <section className="detail-section">
            <h3>Booking Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Service Type:</label>
                <span>{getValue(booking, 'service_type')}</span>
              </div>
              <div className="detail-item">
                <label>City:</label>
                <span>{getValue(booking, 'city')}</span>
              </div>
              <div className="detail-item">
                <label>Area:</label>
                <span>{getValue(booking, 'area')}</span>
              </div>
              <div className="detail-item">
                <label>Amount:</label>
                <span className="amount">PKR {getValue(booking, 'quote_pkr') || getValue(booking, 'amount_pkr') || '0'}</span>
              </div>
              <div className="detail-item">
                <label>Booking Time:</label>
                <span>{formatDate(getValue(booking, 'booking_start_time') || getValue(booking, 'createdAt'))}</span>
              </div>
              <div className="detail-item">
                <label>Created Date:</label>
                <span>{formatDate(getValue(booking, 'created_at') || getValue(booking, 'createdAt'))}</span>
              </div>
              {booking.completedAt && (
                <div className="detail-item">
                  <label>Completed Date:</label>
                  <span>{formatDate(booking.completedAt)}</span>
                </div>
              )}
              {booking.location && (
                <div className="detail-item full-width">
                  <label>Location:</label>
                  <span>{getValue(booking, 'location')}</span>
                </div>
              )}
            </div>
          </section>

          <section className="detail-section">
            <h3>Recipient Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>User ID:</label>
                <span className="id-value">{getValue(booking, 'user_id')}</span>
              </div>
              <div className="detail-item">
                <label>User Name:</label>
                <span>{getValue(booking, 'user_name')}</span>
              </div>
              <div className="detail-item">
                <label>User Email:</label>
                <span>{getValue(booking, 'user_email')}</span>
              </div>
              <div className="detail-item">
                <label>User Phone:</label>
                <span>{getValue(booking, 'user_phone')}</span>
              </div>
              <div className="detail-item full-width">
                <label>User Address:</label>
                <span>{getValue(booking, 'user_address')}</span>
              </div>
            </div>
          </section>

          <section className="detail-section">
            <h3>Provider Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Provider ID:</label>
                <span className="id-value">{getValue(booking, 'provider_id')}</span>
              </div>
              <div className="detail-item">
                <label>Provider Name:</label>
                <span>{getValue(booking, 'provider_name')}</span>
              </div>
              <div className="detail-item">
                <label>Service Type:</label>
                <span>{getValue(booking, 'provider_service') || getValue(booking, 'service_type')}</span>
              </div>
              <div className="detail-item">
                <label>Provider Phone:</label>
                <span>{getValue(booking, 'provider_phone')}</span>
              </div>
              <div className="detail-item">
                <label>Provider Rating:</label>
                <span className="rating">⭐ {getValue(booking, 'provider_rating')}</span>
              </div>
              <div className="detail-item">
                <label>Service Area:</label>
                <span>{getValue(booking, 'provider_area') || getValue(booking, 'area')}</span>
              </div>
              <div className="detail-item">
                <label>Response Time:</label>
                <span>{getValue(booking, 'provider_response_time')} min</span>
              </div>
              <div className="detail-item">
                <label>Verified:</label>
                <span>{getValue(booking, 'provider_verified') ? '✓ Yes' : '✗ No'}</span>
              </div>
            </div>
          </section>

          {booking.description && (
            <section className="detail-section">
              <h3>Description</h3>
              <p className="description-text">{booking.description}</p>
            </section>
          )}

          {booking.raw_data && (
            <section className="detail-section">
              <h3>Additional Details</h3>
              <div className="raw-data">
                <pre>{JSON.stringify(booking.raw_data, null, 2)}</pre>
              </div>
            </section>
          )}

          <section className="detail-section">
            <h3>Status Management</h3>
            <div className="status-manager">
              <div className="status-selector">
                <label>Current Status:</label>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={`status-select status-${selectedStatus}`}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {selectedStatus !== booking.status && (
                <button 
                  className="btn-update-status"
                  onClick={handleStatusChange}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              )}
            </div>
          </section>

          {booking.notes && (
            <section className="detail-section">
              <h3>Admin Notes</h3>
              <p className="notes-text">{booking.notes}</p>
            </section>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button 
            className="btn-danger" 
            onClick={handleDelete}
            title="Delete this booking permanently"
          >
            🗑️ Delete Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingDetailModal;
