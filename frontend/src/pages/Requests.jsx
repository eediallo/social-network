import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';

export default function Requests() {
  const [followRequests, setFollowRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFollowRequests();
  }, []);

  const fetchFollowRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/follow/requests', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Follow requests:', data);
        setFollowRequests(data || []);
      } else {
        setError('Failed to load follow requests');
      }
    } catch (err) {
      console.error('Error fetching follow requests:', err);
      setError('Failed to load follow requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId, action) => {
    try {
      console.log(`${action}ing follow request:`, requestId);
      const res = await fetch(`/api/follow/requests/${requestId}/${action}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        const result = await res.json();
        console.log('Request handled:', result);
        alert(`Follow request ${action}ed successfully!`);
        
        // Remove the handled request from the list
        setFollowRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        const errorText = await res.text();
        console.error('Handle request failed:', res.status, errorText);
        alert(`Failed to ${action} request: ${errorText}`);
      }
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      alert(`Failed to ${action} request. Please try again.`);
    }
  };

  if (loading) {
    return (
      <div className="requests-container">
        <div className="loading-container">
          <span className="loading"></span>
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="requests-container">
        <div className="error-message">
          <p className="text-error">{error}</p>
          <button 
            onClick={fetchFollowRequests}
            className="btn btn-primary btn-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="requests-container">
      <div className="requests-header">
        <h2>Follow Requests</h2>
        <span className="request-count">{followRequests.length} pending</span>
      </div>

      {followRequests.length === 0 ? (
        <div className="no-requests">
          <div className="no-requests-icon">👤</div>
          <h3>No pending requests</h3>
          <p>No one has requested to follow you yet.</p>
        </div>
      ) : (
        <div className="requests-list">
          {followRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-user">
                <div className="user-avatar">
                  {request.avatar_url && request.avatar_url.trim() !== '' ? (
                    <img 
                      src={request.avatar_url} 
                      alt={`${request.first_name} ${request.last_name}`}
                      className="w-full h-full"
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(request.first_name, request.last_name)
                  )}
                </div>
                <div className="user-info">
                  <h4 className="user-name">{request.first_name} {request.last_name}</h4>
                  <p className="user-email">{request.email}</p>
                  <span className="request-date">
                    Requested {formatRelativeTime(request.created_at)}
                  </span>
                </div>
              </div>
              
              <div className="request-actions">
                <button
                  onClick={() => handleRequest(request.id, 'accept')}
                  className="btn btn-success btn-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRequest(request.id, 'decline')}
                  className="btn btn-outline btn-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
