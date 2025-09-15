import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';

export default function Invitations() {
  const [invitations, setInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('received');

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch received invitations
      const receivedRes = await fetch('/api/groups/invitations/received', { 
        credentials: 'include' 
      });
      if (receivedRes.ok) {
        const receivedData = await receivedRes.json();
        console.log('Received invitations:', receivedData);
        setInvitations(receivedData || []);
      }

      // Fetch sent invitations (we'll need to create this endpoint)
      const sentRes = await fetch('/api/groups/invitations/sent', { 
        credentials: 'include' 
      });
      if (sentRes.ok) {
        const sentData = await sentRes.json();
        console.log('Sent invitations:', sentData);
        setSentInvitations(sentData || []);
      }

    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId, groupId) => {
    try {
      console.log('Accepting invitation:', invitationId, 'for group:', groupId);
      const res = await fetch(`/api/groups/${groupId}/invitations/${invitationId}/accept`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        alert('Invitation accepted! You are now a member of the group.');
        fetchInvitations();
      } else {
        const errorText = await res.text();
        alert(`Failed to accept invitation: ${errorText}`);
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      alert('Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvitation = async (invitationId, groupId) => {
    try {
      console.log('Declining invitation:', invitationId, 'for group:', groupId);
      const res = await fetch(`/api/groups/${groupId}/invitations/${invitationId}/decline`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        alert('Invitation declined.');
        fetchInvitations();
      } else {
        const errorText = await res.text();
        alert(`Failed to decline invitation: ${errorText}`);
      }
    } catch (err) {
      console.error('Error declining invitation:', err);
      alert('Failed to decline invitation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center mt-5">
          <div className="loading"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="d-flex justify-between align-center mb-4">
        <h1>Group Invitations</h1>
        <Link to="/groups" className="btn btn-outline">
          Back to Groups
        </Link>
      </div>

      {error && (
        <div className="card mb-4">
          <div className="card-body text-center">
            <p className="text-error">{error}</p>
            <button 
              onClick={fetchInvitations}
              className="btn btn-primary btn-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Received ({invitations.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent ({sentInvitations.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'received' && (
          <div className="invitations-list">
            {invitations.length === 0 ? (
              <div className="card">
                <div className="card-body text-center">
                  <h3>No invitations</h3>
                  <p>You don't have any pending group invitations.</p>
                </div>
              </div>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="invitation-card">
                  <div className="invitation-header">
                    <div className="invitation-icon">
                      📧
                    </div>
                    <div className="invitation-info">
                      <h3>Invited to "{invitation.group_title}"</h3>
                      <p className="invitation-description">
                        {invitation.from_user_name} invited you to join this group
                      </p>
                      {invitation.group_description && (
                        <p className="invitation-group-desc">
                          {invitation.group_description}
                        </p>
                      )}
                      <div className="invitation-meta">
                        <span>Received {formatRelativeTime(invitation.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="invitation-actions">
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id, invitation.group_id)}
                      className="btn btn-success btn-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(invitation.id, invitation.group_id)}
                      className="btn btn-outline btn-sm"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="invitations-list">
            {sentInvitations.length === 0 ? (
              <div className="card">
                <div className="card-body text-center">
                  <h3>No sent invitations</h3>
                  <p>You haven't sent any group invitations yet.</p>
                </div>
              </div>
            ) : (
              sentInvitations.map((invitation) => (
                <div key={invitation.id} className="invitation-card">
                  <div className="invitation-header">
                    <div className="invitation-icon">
                      📤
                    </div>
                    <div className="invitation-info">
                      <h3>Invitation Sent</h3>
                      <p className="invitation-description">
                        You invited someone to join a group
                      </p>
                      <div className="invitation-meta">
                        <span>Sent {formatRelativeTime(invitation.created_at)}</span>
                        <span className={`invitation-status status-${invitation.status}`}>
                          {invitation.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
