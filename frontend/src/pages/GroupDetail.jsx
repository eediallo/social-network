import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';
import { useUser } from '../context/useUser';
import UserSearch from '../components/UserSearch';
import JoinRequests from '../components/JoinRequests';
import GroupEvents from '../components/GroupEvents';

export default function GroupDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [isMember, setIsMember] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: ''
  });
  const [eventsRefreshTrigger, setEventsRefreshTrigger] = useState(0);

  useEffect(() => {
    if (id) {
      console.log('GroupDetail mounted with group ID:', id);
      console.log('Current user:', user);
      fetchGroupDetails();
    }
  }, [id, user]);

  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['posts', 'events', 'members', 'requests'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching group details for group:', id);
      
      // Fetch group info
      const groupRes = await fetch(`/api/groups/${id}`, { credentials: 'include' });
      console.log('Group info response:', groupRes.status);
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        console.log('Group data:', groupData);
        setGroup(groupData);
        setIsOwner(groupData.owner_user_id === user?.id);
      } else {
        console.error('Failed to fetch group info:', groupRes.status);
        setError('Failed to load group information');
        return;
      }

      // Fetch group members (always try to fetch - it's public info)
      const memberRes = await fetch(`/api/groups/${id}/members`, { credentials: 'include' });
      console.log('Members response:', memberRes.status);
      let userIsMember = false;
      if (memberRes.ok) {
        const membersData = await memberRes.json();
        console.log('Members data:', membersData);
        setMembers(membersData || []);
        userIsMember = membersData.some(member => member.user_id === user?.id);
        setIsMember(userIsMember);
      } else {
        console.log('Failed to fetch members:', memberRes.status);
        setMembers([]);
        setIsMember(false);
      }

      // Fetch group events (only if member)
      if (userIsMember) {
        const eventsRes = await fetch(`/api/groups/${id}/events`, { credentials: 'include' });
        console.log('Events response:', eventsRes.status);
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          console.log('Events data:', eventsData);
          setEvents(eventsData || []);
        }
      }

      // Fetch group posts (only if member)
      if (userIsMember) {
        const postsRes = await fetch(`/api/groups/${id}/posts`, { credentials: 'include' });
        console.log('Posts response:', postsRes.status);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          console.log('Posts data:', postsData);
          setPosts(postsData || []);
        }
      }

    } catch (err) {
      console.error('Error fetching group details:', err);
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      console.log('Sending join request for group:', id);
      const res = await fetch(`/api/groups/${id}/requests`, {
        method: 'POST',
        credentials: 'include'
      });
      
      console.log('Join request response:', res.status);
      if (res.ok) {
        const result = await res.json();
        console.log('Join request result:', result);
        alert('Join request sent! The group owner will review your request.');
        fetchGroupDetails();
      } else {
        const errorText = await res.text();
        console.error('Join request failed:', res.status, errorText);
        alert(`Failed to send join request: ${errorText}`);
      }
    } catch (err) {
      console.error('Error joining group:', err);
      alert('Failed to join group. Please try again.');
    }
  };

  const handleInviteUser = async (userId) => {
    try {
      console.log('Inviting user:', userId, 'to group:', id);
      const res = await fetch(`/api/groups/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        credentials: 'include'
      });

      console.log('Invite response:', res.status);
      if (res.ok) {
        alert('Invitation sent successfully!');
        setShowInviteForm(false);
      } else {
        const errorText = await res.text();
        console.error('Invite failed:', res.status, errorText);
        alert(`Failed to send invitation: ${errorText}`);
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      alert('Failed to invite user. Please try again.');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.event_date) return;

    try {
      console.log('Creating event for group:', id, eventForm);
      const res = await fetch(`/api/groups/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
        credentials: 'include'
      });

      console.log('Create event response:', res.status);
      if (res.ok) {
        const result = await res.json();
        console.log('Event created:', result);
        alert('Event created successfully!');
        setEventForm({ title: '', description: '', event_date: '', location: '' });
        setShowEventForm(false);
        // Switch to events tab to show the new event
        setActiveTab('events');
        // Trigger refresh of the GroupEvents component
        setEventsRefreshTrigger(prev => prev + 1);
      } else {
        const errorText = await res.text();
        console.error('Create event failed:', res.status, errorText);
        alert(`Failed to create event: ${errorText}`);
      }
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleEventResponse = async (eventId, status) => {
    try {
      const res = await fetch(`/api/groups/${id}/events/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });

      if (res.ok) {
        fetchGroupDetails();
      } else {
        alert('Failed to respond to event');
      }
    } catch (err) {
      console.error('Error responding to event:', err);
      alert('Failed to respond to event');
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

  if (error || !group) {
    return (
      <div className="container">
        <div className="card">
          <div className="card-body text-center">
            <h3>Group Not Found</h3>
            <p>{error || 'This group does not exist or you do not have access to it.'}</p>
            <Link to="/groups" className="btn btn-primary">
              Back to Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="group-header">
        <div className="group-header-info">
          <div className="group-icon-large">
            {group.title.charAt(0).toUpperCase()}
          </div>
          <div className="group-header-details">
            <h1>{group.title}</h1>
            <p className="group-description">{group.description}</p>
            <div className="group-meta">
              <span>Created {formatRelativeTime(group.created_at)}</span>
              <span>•</span>
              <span>{members.length} members</span>
            </div>
          </div>
        </div>
        
        <div className="group-actions">
          {!isMember ? (
            <button onClick={handleJoinGroup} className="btn btn-primary">
              Join Group
            </button>
          ) : (
            <div className="group-member-actions">
              {isOwner && (
                <button 
                  onClick={() => setShowInviteForm(true)}
                  className="btn btn-outline"
                >
                  Invite Users
                </button>
              )}
              <button 
                onClick={() => setShowEventForm(true)}
                className="btn btn-primary"
              >
                Create Event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Invite User to Group</h3>
              <button 
                onClick={() => setShowInviteForm(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Search and invite users:</label>
                <UserSearch 
                  onInviteUser={handleInviteUser}
                  groupId={id}
                />
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setShowInviteForm(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create Event</h3>
              <button 
                onClick={() => setShowEventForm(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateEvent}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Event Title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <textarea
                    placeholder="Event Description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    className="form-input form-textarea"
                  />
                </div>
                <div className="form-group">
                  <input
                    type="datetime-local"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({...eventForm, event_date: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Location (optional)"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    Create Event
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowEventForm(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts
        </button>
        <button 
          className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button 
          className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        {isOwner && (
          <button 
            className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Join Requests
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'posts' && (
          <div className="group-posts">
            {isMember && (
              <div className="card mb-4">
                <div className="card-body">
                  <h4>Create Post</h4>
                  <p>Group posts functionality coming soon...</p>
                </div>
              </div>
            )}
            
            {posts.length === 0 ? (
              <div className="card">
                <div className="card-body text-center">
                  <h3>No posts yet</h3>
                  <p>Be the first to share something in this group!</p>
                </div>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="post">
                  <div className="post-header">
                    <div className="post-avatar">
                      {getInitials(post.first_name, post.last_name)}
                    </div>
                    <div className="post-author">
                      <span className="post-author-name">
                        {post.first_name} {post.last_name}
                      </span>
                      <div className="post-meta">
                        <span>{formatRelativeTime(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="post-content">
                    <div className="post-text">{post.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <GroupEvents key={`events-${id}-${eventsRefreshTrigger}`} groupId={id} isMember={isMember} />
        )}

        {activeTab === 'members' && (
          <div className="group-members">
            {members.length === 0 ? (
              <div className="card">
                <div className="card-body text-center">
                  <h3>No members yet</h3>
                  <p>This group doesn't have any members yet.</p>
                </div>
              </div>
            ) : (
              <div className="members-grid">
                {members.map(member => (
                  <div key={member.user_id} className="member-card">
                    <div className="member-avatar">
                      {getInitials(member.first_name, member.last_name)}
                    </div>
                    <div className="member-info">
                      <h4>{member.first_name} {member.last_name}</h4>
                      <span className="member-role">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="group-join-requests">
            <JoinRequests 
              groupId={id} 
              onRequestHandled={() => {
                // Refresh group details when a request is handled
                fetchGroupDetails();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
