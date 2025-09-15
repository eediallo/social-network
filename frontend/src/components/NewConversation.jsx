import { useState, useEffect } from 'react';
import { getInitials } from '../utils/avatarUtils';

export default function NewConversation({ onClose, onSelectUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/groups/search/users?q=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      } else {
        setError('Failed to search users');
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    onSelectUser({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Start New Conversation</h3>
        <button onClick={onClose} className="chat-close">×</button>
      </div>
      
      <div className="new-conversation">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search for a user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            autoFocus
          />
        </div>

        {loading && (
          <div className="search-loading">
            <div className="loading"></div>
            <p>Searching...</p>
          </div>
        )}

        {error && (
          <div className="search-error">
            <p>{error}</p>
            <button onClick={searchUsers} className="btn btn-outline btn-sm">
              Retry
            </button>
          </div>
        )}

        {users.length > 0 && (
          <div className="users-list">
            <h4>Select a user to start chatting:</h4>
            {users.map(user => (
              <div
                key={user.id}
                className="user-item"
                onClick={() => handleUserSelect(user)}
              >
                <div className="user-avatar">
                  {getInitials(`${user.first_name} ${user.last_name}`)}
                </div>
                <div className="user-info">
                  <div className="user-name">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="user-email">
                    {user.email}
                  </div>
                </div>
                <div className="user-action">
                  <span className="action-icon">→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchTerm.length > 0 && searchTerm.length <= 2 && (
          <div className="search-hint">
            <p>Type at least 3 characters to search</p>
          </div>
        )}

        {searchTerm.length > 2 && users.length === 0 && !loading && !error && (
          <div className="no-results">
            <p>No users found matching "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
