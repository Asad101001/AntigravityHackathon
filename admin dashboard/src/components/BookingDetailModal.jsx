import { useState } from 'react';
import {
  X, RefreshCw, Trash2, Star, CheckCircle, Clock, XCircle, AlertCircle
} from 'lucide-react';
import './BookingDetailModal.css';

const STATUS_META = {
  pending:   { Icon: Clock,        color: '#D97706' },
  confirmed: { Icon: AlertCircle,  color: '#2F80ED' },
  completed: { Icon: CheckCircle,  color: '#0E8F46' },
  cancelled: { Icon: XCircle,      color: '#DC2626' },
};

function BookingDetailModal({ booking, onClose, onDelete, onStatusUpdate, formatDate }) {
  const [selectedStatus, setSelectedStatus] = useState(booking.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async () => {
    if (selectedStatus === booking.status) {
      alert('Please select a different status');
      return;
    }
    if (window.confirm(`Update booking status to "${selectedStatus}"?`)) {
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

  const getValue = (obj, path, fallback = '—') => {
    const value = path.split('.').reduce((current, prop) => current?.[prop], obj);
    return value && value !== '' ? value : fallback;
  };

  const { Icon: StatusIcon, color: statusColor } = STATUS_META[booking.status] || STATUS_META.pending;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-top">
            <div className="modal-status-icon" style={{ background: `${statusColor}22`, borderColor: `${statusColor}44` }}>
              <StatusIcon size={18} strokeWidth={1.75} color={statusColor} />
            </div>
            <div>
              <h2>Booking Details</h2>
              <p className="booking-id">#{booking._id}</p>
            </div>
          </div>
          <span className={`modal-status-badge status-${booking.status}`}>{booking.status}</span>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Booking Info */}
          <section className="detail-section">
            <h3>Booking Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Service Type</label>
                <span>{getValue(booking, 'service_type')}</span>
              </div>
              <div className="detail-item">
                <label>City</label>
                <span>{getValue(booking, 'city')}</span>
              </div>
              <div className="detail-item">
                <label>Area</label>
                <span>{getValue(booking, 'area')}</span>
              </div>
              <div className="detail-item">
                <label>Amount</label>
                <span className="amount">
                  PKR {(getValue(booking, 'quote_pkr') || getValue(booking, 'amount_pkr') || 0).toLocaleString()}
                </span>
              </div>
              <div className="detail-item">
                <label>Booking Time</label>
                <span>{formatDate(getValue(booking, 'booking_start_time') || getValue(booking, 'createdAt'))}</span>
              </div>
              <div className="detail-item">
                <label>Created</label>
                <span>{formatDate(getValue(booking, 'created_at') || getValue(booking, 'createdAt'))}</span>
              </div>
              {booking.completedAt && (
                <div className="detail-item">
                  <label>Completed</label>
                  <span>{formatDate(booking.completedAt)}</span>
                </div>
              )}
              {booking.location && (
                <div className="detail-item full-width">
                  <label>Location</label>
                  <span>{getValue(booking, 'location')}</span>
                </div>
              )}
            </div>
          </section>

          {/* Recipient */}
          <section className="detail-section">
            <h3>Recipient</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>User ID</label>
                <code className="id-value">{getValue(booking, 'user_id')}</code>
              </div>
              <div className="detail-item">
                <label>Name</label>
                <span>{getValue(booking, 'user_name')}</span>
              </div>
              <div className="detail-item">
                <label>Email</label>
                <span>{getValue(booking, 'user_email')}</span>
              </div>
              <div className="detail-item">
                <label>Phone</label>
                <span>{getValue(booking, 'user_phone')}</span>
              </div>
              <div className="detail-item full-width">
                <label>Address</label>
                <span>{getValue(booking, 'user_address')}</span>
              </div>
            </div>
          </section>

          {/* Provider */}
          <section className="detail-section">
            <h3>Service Provider</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Provider ID</label>
                <code className="id-value">{getValue(booking, 'provider_id')}</code>
              </div>
              <div className="detail-item">
                <label>Name</label>
                <span>{getValue(booking, 'provider_name')}</span>
              </div>
              <div className="detail-item">
                <label>Service</label>
                <span>{getValue(booking, 'provider_service') || getValue(booking, 'service_type')}</span>
              </div>
              <div className="detail-item">
                <label>Phone</label>
                <span>{getValue(booking, 'provider_phone')}</span>
              </div>
              <div className="detail-item">
                <label>Rating</label>
                <span className="rating">
                  <Star size={13} strokeWidth={2} fill="currentColor" style={{ marginRight: 3 }} />
                  {getValue(booking, 'provider_rating')}
                </span>
              </div>
              <div className="detail-item">
                <label>Area</label>
                <span>{getValue(booking, 'provider_area') || getValue(booking, 'area')}</span>
              </div>
              <div className="detail-item">
                <label>Response Time</label>
                <span>{getValue(booking, 'provider_response_time')} min</span>
              </div>
              <div className="detail-item">
                <label>Verified</label>
                <span className={getValue(booking, 'provider_verified') ? 'verified-yes' : 'verified-no'}>
                  {getValue(booking, 'provider_verified') ? (
                    <><CheckCircle size={13} strokeWidth={2} /> Verified</>
                  ) : (
                    <><XCircle size={13} strokeWidth={2} /> Unverified</>
                  )}
                </span>
              </div>
            </div>
          </section>

          {booking.description && (
            <section className="detail-section">
              <h3>Description</h3>
              <p className="description-text">{booking.description}</p>
            </section>
          )}

          {/* Status manager */}
          <section className="detail-section">
            <h3>Update Status</h3>
            <div className="status-manager">
              <div className="status-selector">
                <label>Change status to</label>
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
              <button
                className="btn-update-status"
                onClick={handleStatusChange}
                disabled={isUpdating || selectedStatus === booking.status}
              >
                {isUpdating
                  ? <><span className="btn-spinner-sm" /> Updating…</>
                  : <><RefreshCw size={14} strokeWidth={2} /> Apply</>
                }
              </button>
            </div>
          </section>

          {booking.notes && (
            <section className="detail-section">
              <h3>Admin Notes</h3>
              <p className="notes-text">{booking.notes}</p>
            </section>
          )}

          {booking.raw_data && (
            <section className="detail-section">
              <h3>Raw Data</h3>
              <div className="raw-data">
                <pre>{JSON.stringify(booking.raw_data, null, 2)}</pre>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            <X size={14} strokeWidth={2.5} /> Close
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            <Trash2 size={14} strokeWidth={2} /> Delete Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingDetailModal;
