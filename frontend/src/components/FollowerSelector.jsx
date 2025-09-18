import { useState, useEffect } from 'react';
import { getInitials } from '../utils/avatarUtils';

export default function FollowerSelector({ selectedFollowers, onSelectionChange, disabled = false }) {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFollowers();
  }, []);

  const fetchFollowers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/follow/following', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setFollowers(data || []);
      } else {
        setError('Failed to load followers');
      }
    } catch (err) {
      console.error('Error fetching followers:', err);
      setError('Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowerToggle = (followerId) => {
    if (disabled) return;
    
    const isSelected = selectedFollowers.includes(followerId);
    if (isSelected) {
      onSelectionChange(selectedFollowers.filter(id => id !== followerId));
    } else {
      onSelectionChange([...selectedFollowers, followerId]);
    }
  };

  if (loading) {
    return (
      <div className="follower-selector">
        <div className="follower-selector-header">
          <h4>Select Followers</h4>
          <p className="text-muted">Choose who can see this post</p>
        </div>
        <div className="follower-selector-loading">
          <span className="loading"></span>
          <span>Loading followers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="follower-selector">
        <div className="follower-selector-header">
          <h4>Select Followers</h4>
          <p className="text-muted">Choose who can see this post</p>
        </div>
        <div className="follower-selector-error">
          <p className="error-text">{error}</p>
          <button 
            onClick={fetchFollowers}
            className="btn btn-secondary btn-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="follower-selector">
      <div className="follower-selector-header">
        <h4>Select Followers</h4>
        <p className="text-muted">Choose who can see this post ({selectedFollowers.length} selected)</p>
      </div>
      
      {followers.length === 0 ? (
        <div className="follower-selector-empty">
          <p>You're not following anyone yet.</p>
          <p className="text-muted">Follow some people to create selected posts.</p>
        </div>
      ) : (
        <div className="follower-list">
          {followers.map(follower => (
            <div
              key={follower.id}
              className={`follower-item ${selectedFollowers.includes(follower.id) ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => handleFollowerToggle(follower.id)}
            >
              <div className="follower-avatar">
                {follower.avatar_url && follower.avatar_url.trim() !== '' ? (
                  <img 
                    src={follower.avatar_url} 
                    alt={`${follower.first_name} ${follower.last_name}`}
                    className="w-full h-full"
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(follower.first_name, follower.last_name)
                )}
              </div>
              <div className="follower-info">
                <h5 className="follower-name">
                  {follower.first_name} {follower.last_name}
                </h5>
                {follower.nickname && (
                  <p className="follower-nickname">@{follower.nickname}</p>
                )}
              </div>
              <div className="follower-checkbox">
                {selectedFollowers.includes(follower.id) ? (
                  <span className="checkbox-checked">✓</span>
                ) : (
                  <span className="checkbox-unchecked">○</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
