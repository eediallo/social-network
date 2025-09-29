import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../utils/dateUtils';

export default function NotificationToast({ notification, onClose, onAction }) {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show toast after a brief delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Auto-hide after 5 seconds
    const hideTimer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  const handleClick = () => {
    if (notification.action_url) {
      navigate(notification.action_url);
    }
    onAction(notification);
    handleClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'follow_request':
        return '👤';
      case 'follow_accepted':
        return '✅';
      case 'group_invite':
      case 'group_invitation':
        return '👥';
      case 'group_created':
        return '👥';
      case 'group_request':
      case 'group_join_request':
        return '📝';
      case 'group_accepted':
      case 'group_join_accepted':
        return '🎉';
      case 'comment':
        return '💭';
      default:
        return '🔔';
    }
  };

  return (
    <div 
      className={`notification-toast ${isVisible ? 'visible' : ''}`}
      onClick={handleClick}
    >
      <div className="notification-toast-content">
        <div className="notification-toast-icon">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="notification-toast-text">
          <div className="notification-toast-message">
            {notification.message}
          </div>
          <div className="notification-toast-time">
            {formatRelativeTime(notification.created_at)}
          </div>
        </div>
        <button 
          className="notification-toast-close"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
