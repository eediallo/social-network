import { useState, useEffect, useRef } from 'react';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';
import NewConversation from './NewConversation';
import API_BASE_URL from '../config/api';

export default function Chat({ type, targetId, targetName, onClose, onSelectConversation }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);

  console.log('Chat component - type:', type, 'targetId:', targetId, 'targetName:', targetName);

  useEffect(() => {
    if (targetId && targetId !== 'new') {
      fetchMessages();
      connectWebSocket();
    } else if (targetId === 'new') {
      setLoading(false);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [targetId, type]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (targetId === 'new') {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Default to 'direct' if type is undefined
      const messageType = type || 'direct';
      
      const endpoint = messageType === 'direct' 
        ? `${API_BASE_URL}/api/chat/direct/${targetId}`
        : `${API_BASE_URL}/api/chat/group/${targetId}`;
      
      const res = await fetch(endpoint, { credentials: 'include' });
      
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
        
        // Mark all messages as read when opening the chat
        const messageType = type || 'direct';
        if (messageType === 'direct' && data && data.length > 0) {
          markMessagesAsRead(data);
        }
      } else {
        console.error('Failed to fetch messages:', res.status);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (messages) => {
    // Mark all unread messages as read (handle both null and empty string)
    const unreadMessages = messages.filter(msg => !msg.is_from_me && (!msg.read_at || msg.read_at === ''));
    
    for (const message of unreadMessages) {
      try {
        await fetch(`${API_BASE_URL}/api/chat/read/${message.id}`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    }
  };

  const connectWebSocket = () => {
    if (ws) {
      ws.close();
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect to backend server on port 8080, not frontend dev server
    const messageType = type || 'direct';
    const wsUrl = `${protocol}//localhost:8080/ws?group=${messageType === 'group' ? targetId : ''}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected successfully');
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const messageType = type || 'direct';
        if (message.type === messageType && 
            (messageType === 'group' ? message.group_id === targetId : 
             message.recipient_id === targetId || message.sender_id === targetId)) {
          setMessages(prev => [...prev, message]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    
    websocket.onclose = (event) => {
      setConnected(false);
      console.log('WebSocket disconnected:', event.code, event.reason);
      if (event.code === 1006) {
        console.error('WebSocket connection failed - check authentication');
      }
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        if (targetId && targetId !== 'new') {
          console.log('Attempting to reconnect WebSocket...');
          connectWebSocket();
        }
      }, 3000);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };
    
    // Set connection timeout
    setTimeout(() => {
      if (websocket.readyState === WebSocket.CONNECTING) {
        console.error('WebSocket connection timeout');
        websocket.close();
        setConnected(false);
      }
    }, 5000);
    
    setWs(websocket);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    console.log('Send message called, newMessage:', newMessage);
    
    if (!newMessage.trim()) {
      console.log('Message is empty, not sending');
      return;
    }

    try {
      // Default to 'direct' if type is undefined
      const messageType = type || 'direct';
      
      const endpoint = messageType === 'direct' 
        ? `${API_BASE_URL}/api/chat/direct`
        : `${API_BASE_URL}/api/chat/group/${targetId}`;
      
      const body = messageType === 'direct' 
        ? { content: newMessage, recipient_id: targetId }
        : { content: newMessage };

      console.log('Sending message to:', endpoint, 'with body:', body);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      console.log('Send message response status:', res.status);

      if (res.ok) {
        const responseData = await res.json();
        console.log('Send message response:', responseData);
        
        // Add message to local state immediately
        const newMsg = {
          id: responseData.id || Date.now().toString(),
          content: newMessage,
          sender_id: responseData.sender_id || 'current_user',
          created_at: responseData.created_at || new Date().toISOString(),
          is_from_me: true
        };
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
      } else {
        const errorText = await res.text();
        console.error('Failed to send message:', res.status, errorText);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (targetId === 'new') {
    return <NewConversation onClose={onClose} onSelectUser={(user) => onSelectConversation({ type: 'direct', id: user.id, name: user.name })} />;
  }

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
                <span className="status-offline">Offline (messages will be delivered when they come online)</span>
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
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
