import { useState, useEffect } from 'react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const res = await fetch(`/api/notifications/read?id=${notificationId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read_at: new Date().toISOString() }
              : notif
          )
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow_request': return '👤';
      case 'follow_accepted': return '✅';
      case 'comment': return '💬';
      case 'group_invitation': return '👥';
      case 'group_request': return '📝';
      case 'group_event_created': return '📅';
      case 'direct_message': return '💌';
      case 'group_message': return '💬';
      default: return '🔔';
    }
  };

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case 'follow_request':
        return 'wants to follow you';
      case 'follow_accepted':
        return 'accepted your follow request';
      case 'comment':
        return 'commented on your post';
      case 'group_invitation':
        return 'invited you to a group';
      case 'group_request':
        return 'requested to join your group';
      case 'group_event_created':
        return 'created a new event in a group';
      case 'direct_message':
        return 'sent you a message';
      case 'group_message':
        return 'sent a message in a group';
      default:
        return 'has a new notification';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
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
      <h1 className="mb-4">Notifications</h1>

      {error && (
        <div className="card mb-4">
          <div className="card-body text-center">
            <p className="text-error">{error}</p>
            <button 
              onClick={fetchNotifications}
              className="btn btn-primary btn-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {notifications.length === 0 && !error && (
        <div className="card">
          <div className="card-body text-center">
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        </div>
      )}

      <div className="notifications-list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification ${!notification.read_at ? 'unread' : ''}`}
            onClick={() => !notification.read_at && markAsRead(notification.id)}
          >
            <div className="notification-avatar">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="notification-content">
              <div className="notification-text">
                <strong>User {notification.actor_user_id}</strong>{' '}
                {getNotificationText(notification)}
              </div>
              <div className="notification-time">
                {formatTime(notification.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
