import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';

export default function JoinRequests({ groupId, onRequestHandled }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (groupId) {
      fetchJoinRequests();
    }
  }, [groupId]);

  const fetchJoinRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch(`/api/groups/${groupId}/join-requests`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Join requests:', data);
        setRequests(data || []);
      } else if (res.status === 403) {
        setError('You must be the group owner to view join requests');
      } else {
        setError('Failed to load join requests');
      }
    } catch (err) {
      console.error('Error fetching join requests:', err);
      setError('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId, action) => {
    try {
      console.log(`${action}ing join request:`, requestId);
      const res = await fetch(`/api/groups/${groupId}/join-requests/${requestId}/${action}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        const result = await res.json();
        console.log('Request handled:', result);
        alert(`Join request ${action}ed successfully!`);
        
        // Remove the handled request from the list
        setRequests(prev => prev.filter(req => req.id !== requestId));
        
        // Notify parent component
        if (onRequestHandled) {
          onRequestHandled();
        }
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
      <div className="join-requests-container">
        <div className="loading-container">
          <span className="loading"></span>
          <p>Loading join requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="join-requests-container">
        <div className="error-message">
          <p className="text-error">{error}</p>
          <button 
            onClick={fetchJoinRequests}
            className="btn btn-primary btn-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-requests-container">
      <div className="join-requests-header">
        <h3>Join Requests</h3>
        <span className="request-count">{requests.length} pending</span>
      </div>

      {requests.length === 0 ? (
        <div className="no-requests">
          <div className="no-requests-icon">📝</div>
          <h4>No pending requests</h4>
          <p>No one has requested to join this group yet.</p>
        </div>
      ) : (
        <div className="join-requests-list">
          {requests.map((request) => (
            <div key={request.id} className="join-request-card">
              <div className="request-user">
                <div className="user-avatar">
                  {getInitials(request.user_name)}
                </div>
                <div className="user-info">
                  <h4 className="user-name">{request.user_name}</h4>
                  <p className="user-email">{request.user_email}</p>
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
