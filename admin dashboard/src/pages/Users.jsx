import { useState, useEffect } from 'react';
import axios from 'axios';
import './Users.css';

function Users({ auth, apiBaseUrl }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const fetchUsers = async (pageNum) => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiBaseUrl}/api/admin/users?page=${pageNum}&limit=20`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
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
      const response = await axios.post(`${apiBaseUrl}/api/admin/users/${userId}/toggle-admin`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (response.data.success) {
        // Remove password from display
        const updatedUsers = users.map(user =>
          user.id === userId ? { ...user, isAdmin: response.data.user.isAdmin } : user
        );
        setUsers(updatedUsers);
      }
    } catch (err) {
      console.error('Error toggling admin:', err);
    }
  };

  if (loading) {
    return <div className="users-loading">Loading users...</div>;
  }

  return (
    <div className="users-container">
      <h2>Users Management</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Display Name</th>
              <th>City</th>
              <th>Login Count</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id?.slice(-8)}</td>
                <td>{user.email}</td>
                <td>{user.displayName}</td>
                <td>{user.city || 'N/A'}</td>
                <td>{user.loginCount || 0}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button
                    className="btn-admin"
                    onClick={() => handleToggleAdmin(user.id)}
                    title={user.isAdmin ? 'Remove admin' : 'Make admin'}
                  >
                    {user.isAdmin ? '⭐ Admin' : 'Make Admin'}
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
    </div>
  );
}

export default Users;
