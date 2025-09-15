import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../utils/dateUtils';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const getNotificationMessage = (type, actorId) => {
    switch (type) {
      case 'comment':
        return 'commented on your post';
      case 'follow_request':
        return 'sent you a follow request';
      case 'follow_accepted':
        return 'accepted your follow request';
      case 'group_invite':
        return 'invited you to a group';
      case 'group_request':
        return 'requested to join your group';
      case 'group_accepted':
        return 'accepted your group join request';
      case 'event_invite':
        return 'invited you to an event';
      default:
        return 'interacted with your content';
    }
  };
  const [error, setError] = useState('');

  const handleNotificationClick = async (notification) => {
    try {
      // Mark notification as read
      if (!notification.read_at) {
        await fetch(`/api/notifications/mark-read?id=${notification.id}`, {
          method: 'POST',
          credentials: 'include'
        });
      }

      // Navigate to the appropriate page
      if (notification.action_url) {
        navigate(notification.action_url);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read_at);
      await Promise.all(
        unreadNotifications.map(notification =>
          fetch(`/api/notifications/mark-read?id=${notification.id}`, {
            method: 'POST',
            credentials: 'include'
          })
        )
      );
      fetchNotifications(); // Refresh the list
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Mock data for testing UI
  const mockNotifications = [
    {
      id: '1',
      type: 'follow_request',
      message: 'John Doe sent you a follow request',
      read_at: null,
      created_at: new Date().toISOString(),
      user: { first_name: 'John', last_name: 'Doe' }
    },
    {
      id: '2',
      type: 'like',
      message: 'Jane Smith liked your post',
      read_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      user: { first_name: 'Jane', last_name: 'Smith' }
    },
    {
      id: '3',
      type: 'comment',
      message: 'Alex Johnson commented on your post',
      read_at: null,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      user: { first_name: 'Alex', last_name: 'Johnson' }
    },
    {
      id: '4',
      type: 'group_invite',
      message: 'You were invited to join "Tech Enthusiasts" group',
      read_at: null,
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      user: { first_name: 'Tech', last_name: 'Enthusiasts' }
    },
    {
      id: '5',
      type: 'event_reminder',
      message: 'Event "Photography Workshop" starts in 1 hour',
      read_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      user: { first_name: 'Photography', last_name: 'Club' }
    }
  ];

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Handle null response or empty array
        if (data === null || !Array.isArray(data)) {
          console.log('No notifications found, using mock data for UI testing');
          setNotifications(mockNotifications);
        } else {
          // Use the enhanced notification data directly from backend
          console.log('Raw notifications data:', data);
          setNotifications(data);
        }
      } else {
        // Use mock data for testing UI
        console.log('Using mock notifications data for UI testing');
        setNotifications(mockNotifications);
      }
    } catch (err) {
      console.log('Network error, using mock notifications data for UI testing');
      setNotifications(mockNotifications);
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
              ? { ...notif, read: true }
              : notif
          )
        );
      } else {
        console.error('Failed to mark notification as read:', res.status);
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
    return formatRelativeTime(timestamp);
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
            className={`notification ${!notification.read_at ? 'unread' : ''} ${notification.action_url ? 'clickable' : ''}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="notification-avatar">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="notification-content">
              <div className="notification-text">
                {notification.message || (
                  <>
                    <strong>{notification.actor_name}</strong>{' '}
                    {getNotificationText(notification)}
                  </>
                )}
              </div>
              <div className="notification-time">
                {notification.created_at ? (() => {
                  try {
                    return formatRelativeTime(notification.created_at);
                  } catch (error) {
                    console.error('Date formatting error:', error, notification.created_at);
                    return new Date(notification.created_at).toLocaleDateString();
                  }
                })() : 'Unknown time'}
              </div>
            </div>
            {!notification.read_at && (
              <div className="notification-dot"></div>
            )}
            {notification.action_url && (
              <div className="notification-arrow">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
