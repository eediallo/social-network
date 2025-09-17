import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { formatRelativeTime } from '../utils/dateUtils';

export default function NotificationPanel() {
  const { 
    notifications, 
    unreadCount, 
    isOpen, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    closeNotifications 
  } = useNotifications();
  
  const navigate = useNavigate();
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        closeNotifications();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeNotifications]);

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    // Navigate to the action URL
    if (notification.action_url) {
      navigate(notification.action_url);
      closeNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  if (!isOpen) return null;

  return (
    <div className="notification-panel" ref={panelRef}>
      <div className="notification-panel-header">
        <h3>Notifications</h3>
        <div className="notification-panel-actions">
          {unreadCount > 0 && (
            <button 
              className="btn btn-sm btn-outline"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </button>
          )}
          <button 
            className="notification-close"
            onClick={closeNotifications}
          >
            ×
          </button>
        </div>
      </div>

      <div className="notification-panel-content">
        {loading ? (
          <div className="notification-loading">
            <div className="loading"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <div className="notification-empty-icon">🔔</div>
            <p>No notifications yet</p>
            <span>You're all caught up!</span>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read_at ? 'unread' : 'read'}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-item-content">
                  <div className="notification-message">
                    {notification.message}
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
        )}
      </div>
    </div>
  );
}
