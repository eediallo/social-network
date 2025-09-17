import { useState, useEffect } from 'react';
import { getInitials } from '../utils/avatarUtils';
import API_BASE_URL from '../config/api';

export default function NewConversation({ onClose, onSelectConversation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('direct');

  useEffect(() => {
    if (searchTerm.length > 2) {
      if (activeTab === 'direct') {
        searchUsers();
      } else {
        searchGroups();
      }
    } else {
      setUsers([]);
      setGroups([]);
    }
  }, [searchTerm, activeTab]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/groups/search/users?q=${encodeURIComponent(searchTerm)}`, {
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

  const searchGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/groups?search=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        // Filter groups where user is a member or owner
        const userGroups = data.filter(group => group.is_member || group.user_role === 'owner');
        setGroups(userGroups || []);
      } else {
        setError('Failed to search groups');
      }
    } catch (err) {
      console.error('Error searching groups:', err);
      setError('Failed to search groups');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    console.log('User selected:', user);
    onSelectConversation({
      type: 'direct',
      id: user.id,
      name: `${user.first_name} ${user.last_name}`
    });
  };

  const handleGroupSelect = (group) => {
    console.log('Group selected:', group);
    onSelectConversation({
      type: 'group',
      id: group.ID,
      name: group.Title
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Start New Conversation</h3>
        <button onClick={onClose} className="chat-close">×</button>
      </div>
      
      <div className="new-conversation">
        <div className="conversation-tabs">
          <button 
            className={`tab-button ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => setActiveTab('direct')}
          >
            Direct Message
          </button>
          <button 
            className={`tab-button ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            Group Chat
          </button>
        </div>

        <div className="search-section">
          <input
            type="text"
            placeholder={activeTab === 'direct' ? "Search for a user..." : "Search for a group..."}
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

        {activeTab === 'direct' && users.length > 0 && (
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

        {activeTab === 'group' && groups.length > 0 && (
          <div className="groups-list">
            <h4>Select a group to start chatting:</h4>
            {groups.map(group => (
              <div
                key={group.ID}
                className="group-item"
                onClick={() => handleGroupSelect(group)}
              >
                <div className="group-avatar">
                  👥
                </div>
                <div className="group-info">
                  <div className="group-name">
                    {group.Title}
                  </div>
                  <div className="group-description">
                    {group.Description}
                  </div>
                </div>
                <div className="group-action">
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

        {searchTerm.length > 2 && ((activeTab === 'direct' && users.length === 0) || (activeTab === 'group' && groups.length === 0)) && !loading && !error && (
          <div className="no-results">
            <p>No {activeTab === 'direct' ? 'users' : 'groups'} found matching "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
