import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, ShieldCheck, ShieldOff, AlertCircle } from 'lucide-react';
import './Users.css';

function Users({ auth, apiBaseUrl }) {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => { fetchUsers(page); }, [page]);

  const fetchUsers = async (pageNum) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiBaseUrl}/api/admin/users?page=${pageNum}&limit=20`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/admin/users/${userId}/toggle-admin`, {},
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      if (response.data.success) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, isAdmin: response.data.user.isAdmin } : user
        ));
        toast.success(response.data.user.isAdmin ? 'User promoted to Admin' : 'Admin rights revoked');
      }
    } catch (err) {
      toast.error('Failed to change admin status');
      console.error('Error toggling admin:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-spinner" />
        <span>Loading users…</span>
      </div>
    );
  }

  return (
    <div className="users-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">{pagination.total ? `${pagination.total} registered users` : 'Registered accounts'}</p>
        </div>
      </div>

      {error && (
        <div className="page-error">
          <AlertCircle size={16} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Name</th>
              <th>City</th>
              <th>Logins</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><code className="mono-id">{user.id?.slice(-8)}</code></td>
                <td className="email-cell">{user.email}</td>
                <td>{user.displayName || '—'}</td>
                <td>{user.city || '—'}</td>
                <td className="num-cell">{user.loginCount || 0}</td>
                <td className="date-cell">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="date-cell">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button
                    className={`btn-role ${user.isAdmin ? 'btn-role-admin' : ''}`}
                    onClick={() => handleToggleAdmin(user.id)}
                    title={user.isAdmin ? 'Remove admin' : 'Make admin'}
                  >
                    {user.isAdmin
                      ? <><ShieldCheck size={13} strokeWidth={2} /> Admin</>
                      : <><ShieldOff size={13} strokeWidth={2} /> User</>
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="btn-pagination"
          >
            <ChevronLeft size={16} strokeWidth={2} /> Prev
          </button>
          <span className="page-info">Page {pagination.page} / {pagination.pages}</span>
          <button
            disabled={page === pagination.pages}
            onClick={() => setPage(page + 1)}
            className="btn-pagination"
          >
            Next <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Users;
