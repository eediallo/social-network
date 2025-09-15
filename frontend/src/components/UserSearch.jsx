import { useState, useEffect } from 'react';
import { getInitials } from '../utils/avatarUtils';

export default function UserSearch({ onInviteUser, groupId, disabled = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const searchUsers = async (query) => {
    try {
      setIsSearching(true);
      const res = await fetch(`/api/groups/search/users?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const users = await res.json();
        setSearchResults(users);
        setShowResults(true);
      } else {
        console.error('Failed to search users');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteUser = async (user) => {
    try {
      await onInviteUser(user.id);
      // Clear search after successful invite
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
    } catch (err) {
      console.error('Error inviting user:', err);
    }
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="user-search-container">
      <div className="user-search-input-wrapper">
        <input
          type="text"
          placeholder="Search users to invite..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          className="user-search-input"
        />
        {isSearching && (
          <div className="user-search-loading">
            <span className="loading"></span>
          </div>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="user-search-results">
          {searchResults.map((user) => (
            <div key={user.id} className="user-search-result">
              <div className="user-avatar">
                {getInitials(user.first_name, user.last_name)}
              </div>
              <div className="user-info">
                <div className="user-name">
                  {user.first_name} {user.last_name}
                </div>
                <div className="user-email">
                  {user.email}
                </div>
              </div>
              <button
                onClick={() => handleInviteUser(user)}
                className="btn btn-primary btn-sm"
                disabled={disabled}
              >
                Invite
              </button>
            </div>
          ))}
        </div>
      )}

      {showResults && searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="user-search-no-results">
          <p>No users found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
