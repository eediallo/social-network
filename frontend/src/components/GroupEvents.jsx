import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../utils/dateUtils';

export default function GroupEvents({ groupId, isMember }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

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
          {events.map(event => (
            <div key={event.id} className="event-card">
              <div className="event-header">
                <h4 className="event-title">{event.title}</h4>
                <div className="event-meta">
                  <span className="event-creator">by {event.created_by_name}</span>
                  <span className="event-date">{formatEventDate(event.event_date)}</span>
                </div>
              </div>
              
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
          ))}
        </div>
      )}
    </div>
  );
}
