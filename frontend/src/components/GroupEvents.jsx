import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../utils/dateUtils';
import { useUser } from '../context/useUser';

export default function GroupEvents({ groupId, isMember }) {
  const { user } = useUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    if (groupId) {
      fetchEvents();
    }
  }, [groupId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/groups/${groupId}/events`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setEvents(data || []);
      } else {
        setError('Failed to load events');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const eventData = {
      title: formData.get('title'),
      description: formData.get('description'),
      event_date: formData.get('event_date'),
      location: formData.get('location')
    };

    setCreateLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
        credentials: 'include'
      });

      if (res.ok) {
        const newEvent = await res.json();
        setEvents(prevEvents => [newEvent, ...prevEvents]);
        setShowCreateForm(false);
        e.target.reset();
        setError('');
      } else {
        const errorText = await res.text();
        setError(`Failed to create event: ${errorText}`);
      }
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Failed to create event');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEventResponse = async (eventId, response) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/events/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
        credentials: 'include'
      });

      if (res.ok) {
        // Refresh events to get updated response counts
        fetchEvents();
      } else {
        console.error('Failed to respond to event');
      }
    } catch (err) {
      console.error('Error responding to event:', err);
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event.id);
    setEditForm({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date ? event.event_date.slice(0, 16) : '', // Format for datetime-local input
      location: event.location || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
    setEditForm({
      title: '',
      description: '',
      event_date: '',
      location: ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim() || !editForm.event_date) return;

    setEditLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/events/${editingEvent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setEvents(prev => prev.map(event => 
          event.id === editingEvent 
            ? { ...event, ...editForm }
            : event
        ));
        setEditingEvent(null);
        setEditForm({
          title: '',
          description: '',
          event_date: '',
          location: ''
        });
      } else {
        console.error('Failed to update event');
        alert('Failed to update event');
      }
    } catch (err) {
      console.error('Error updating event:', err);
      alert('Error updating event');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setDeleteLoading(eventId);
    try {
      const res = await fetch(`/api/groups/${groupId}/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setEvents(prev => prev.filter(event => event.id !== eventId));
        setShowDeleteConfirm(null);
      } else {
        console.error('Failed to delete event');
        alert('Failed to delete event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Error deleting event');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="loading"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="group-events">
      <div className="events-header">
        <h3>Group Events</h3>
        {isMember && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary btn-sm"
          >
            Create Event
          </button>
        )}
      </div>

      {error && (
        <div className="card mb-4">
          <div className="card-body text-center">
            <p className="text-error">{error}</p>
            <button 
              onClick={fetchEvents}
              className="btn btn-primary btn-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Event</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateEvent}>
                <div className="form-group">
                  <label className="form-label">Event Title *</label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    required
                    disabled={createLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-input form-textarea"
                    rows="3"
                    disabled={createLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="event_date"
                    className="form-input"
                    required
                    disabled={createLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    name="location"
                    className="form-input"
                    placeholder="e.g., Community Center, Online"
                    disabled={createLoading}
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createLoading}
                  >
                    {createLoading ? <span className="loading"></span> : 'Create Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn btn-secondary"
                    disabled={createLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card">
          <div className="card-body text-center">
            <h4>No events yet</h4>
            <p>Be the first to create an event for this group!</p>
          </div>
        </div>
      ) : (
        <div className="events-list">
          {events.map(event => {
            const isOwner = user && event.created_by === user.id;
            const isEditing = editingEvent === event.id;
            
            return (
              <div key={event.id} className="event-card">
                <div className="event-header">
                  <h4 className="event-title">{event.title}</h4>
                  <div className="event-meta">
                    <span className="event-creator">by {event.created_by_name}</span>
                    <span className="event-date">{formatEventDate(event.event_date)}</span>
                    {isOwner && !isEditing && (
                      <div className="event-actions">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="event-action-btn"
                          title="Edit event"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(event.id)}
                          className="event-action-btn delete"
                          title="Delete event"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              
              {isEditing ? (
                <div className="event-edit">
                  <div className="form-group">
                    <label className="form-label">Event Title *</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="form-input"
                      required
                      disabled={editLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="form-input form-textarea"
                      rows="3"
                      disabled={editLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={editForm.event_date}
                      onChange={(e) => setEditForm(prev => ({ ...prev, event_date: e.target.value }))}
                      className="form-input"
                      required
                      disabled={editLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                      className="form-input"
                      placeholder="e.g., Community Center, Online"
                      disabled={editLoading}
                    />
                  </div>
                  <div className="event-edit-actions">
                    <button
                      onClick={handleSaveEdit}
                      disabled={editLoading || !editForm.title.trim() || !editForm.event_date}
                      className="btn btn-primary btn-sm"
                    >
                      {editLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={editLoading}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {event.description && (
                    <div className="event-description">
                      <p>{event.description}</p>
                    </div>
                  )}
                  
                  {event.location && (
                    <div className="event-location">
                      <span className="meta-icon">📍</span>
                      <span>{event.location}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="event-responses">
                <div className="response-counts">
                  <span className="response-count going">
                    <span className="response-icon">✅</span>
                    {event.going_count} going
                  </span>
                  <span className="response-count maybe">
                    <span className="response-icon">🤔</span>
                    {event.maybe_count} maybe
                  </span>
                  <span className="response-count not-going">
                    <span className="response-icon">❌</span>
                    {event.not_going_count} not going
                  </span>
                </div>
                
                {isMember && (
                  <div className="response-actions">
                    <button
                      onClick={() => handleEventResponse(event.id, 'going')}
                      className="btn btn-success btn-sm"
                    >
                      Going
                    </button>
                    <button
                      onClick={() => handleEventResponse(event.id, 'maybe')}
                      className="btn btn-warning btn-sm"
                    >
                      Maybe
                    </button>
                    <button
                      onClick={() => handleEventResponse(event.id, 'not_going')}
                      className="btn btn-outline btn-sm"
                    >
                      Not Going
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Event</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this event? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => handleDeleteEvent(showDeleteConfirm)}
                disabled={deleteLoading === showDeleteConfirm}
                className="btn btn-danger"
              >
                {deleteLoading === showDeleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleteLoading === showDeleteConfirm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
