import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import NotificationToast from './NotificationToast';

export default function NotificationManager() {
  const { addNotification, markAsRead } = useNotifications();
  const [toasts, setToasts] = useState([]);
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket connection for real-time notifications
  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket for notifications:', wsUrl);
      const websocket = new WebSocket(wsUrl);
      websocketRef.current = websocket;
      
      websocket.onopen = () => {
        console.log('WebSocket connected for notifications');
        // Reset reconnection attempts on successful connection
        reconnectAttemptsRef.current = 0;
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      websocket.onmessage = (event) => {
        try {
          console.log('Raw WebSocket notification:', event.data);
          const data = JSON.parse(event.data);
          console.log('Parsed WebSocket notification:', data);
          
          // Check if this is a notification message
          if (data.type === 'notification') {
            // Add to notification list
            addNotification(data.notification);
            
            // Show toast if not read
            if (!data.notification.read_at) {
              showToast(data.notification);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket notification:', error);
        }
      };
      
      websocket.onclose = (event) => {
        console.log('WebSocket disconnected for notifications:', event.code);
        websocketRef.current = null;
        
        // Only attempt to reconnect if it wasn't a manual close, we don't already have a pending reconnection, and we haven't exceeded max attempts
        if (event.code !== 1000 && !reconnectTimeoutRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`WebSocket reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          
          // Attempt to reconnect after 10 seconds (longer delay to prevent rapid reconnections)
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket for notifications...');
            reconnectTimeoutRef.current = null; // Clear the ref before attempting reconnection
            connectWebSocket();
          }, 10000);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log('Max reconnection attempts reached. WebSocket will not reconnect automatically.');
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error for notifications:', error);
      };
    };

    // Initial connection
    connectWebSocket();

    return () => {
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close WebSocket if it exists
      if (websocketRef.current) {
        websocketRef.current.close(1000, 'Component unmounting');
        websocketRef.current = null;
      }
    };
  }, []); // Remove addNotification dependency to prevent re-connections

  const showToast = (notification) => {
    const toastId = Date.now() + Math.random();
    setToasts(prev => [...prev, { id: toastId, notification }]);
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const handleToastAction = async (notification) => {
    // Mark notification as read when user interacts with toast
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
  };

  return (
    <div className="notification-manager">
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          notification={toast.notification}
          onClose={() => removeToast(toast.id)}
          onAction={handleToastAction}
        />
      ))}
    </div>
  );
}
