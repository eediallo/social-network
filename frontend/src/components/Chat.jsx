import { useState, useEffect, useRef } from 'react';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';

export default function Chat({ type, targetId, targetName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (targetId) {
      fetchMessages();
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [targetId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'direct' 
        ? `/api/chat/direct/${targetId}`
        : `/api/chat/group/${targetId}`;
      
      const res = await fetch(endpoint, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?group=${type === 'group' ? targetId : ''}`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === type && 
            (type === 'group' ? message.group_id === targetId : 
             message.recipient_id === targetId || message.sender_id === targetId)) {
          setMessages(prev => [...prev, message]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    
    websocket.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };
    
    websocket.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    
    setWs(websocket);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      const endpoint = type === 'direct' 
        ? '/api/chat/direct'
        : `/api/chat/group/${targetId}`;
      
      const body = type === 'direct' 
        ? { content: newMessage, recipient_id: targetId }
        : { content: newMessage };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      if (res.ok) {
        setNewMessage('');
      } else {
        console.error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h3>{targetName}</h3>
          <button onClick={onClose} className="chat-close">×</button>
        </div>
        <div className="chat-loading">
          <div className="loading"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar">
            {getInitials(targetName)}
          </div>
          <div>
            <h3>{targetName}</h3>
            <div className="chat-status">
              {connected ? (
                <span className="status-online">Online</span>
              ) : (
                <span className="status-offline">Connecting...</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="chat-close">×</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`message ${message.is_from_me ? 'message-sent' : 'message-received'}`}
            >
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-time">
                  {formatRelativeTime(message.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
          disabled={!connected}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!newMessage.trim() || !connected}
        >
          Send
        </button>
      </form>
    </div>
  );
}
