import { useState, useEffect, useRef } from 'react';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';
import NewConversation from './NewConversation';
import EmojiPicker from './EmojiPicker';
import API_BASE_URL from '../config/api';
import { useUser } from '../context/useUser';

export default function Chat({ type, targetId, targetName, onClose, onSelectConversation }) {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [messageStatus, setMessageStatus] = useState({}); // Track message delivery status
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  console.log('Chat component - type:', type, 'targetId:', targetId, 'targetName:', targetName);

  // Helper function to add message with deduplication
  const addMessage = (newMessage) => {
    setMessages(prev => {
      // Check if message already exists to avoid duplicates
      const exists = prev.some(msg => msg.id === newMessage.id);
      if (exists) {
        console.log('Message already exists, skipping duplicate:', newMessage.id);
        return prev;
      }
      console.log('Adding new message:', newMessage.id);
      return [...prev, newMessage];
    });
  };

  // Edit message functions
  const handleEditMessage = (message) => {
    setEditingMessage(message.id);
    setEditText(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMessage) return;

    setEditLoading(true);
    try {
      const messageType = type || 'direct';
      const endpoint = messageType === 'direct' 
        ? `${API_BASE_URL}/api/chat/direct/${editingMessage}`
        : `${API_BASE_URL}/api/chat/group/${editingMessage}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editText })
      });

      if (res.ok) {
        setMessages(prev => prev.map(msg => 
          msg.id === editingMessage 
            ? { ...msg, content: editText }
            : msg
        ));
        setEditingMessage(null);
        setEditText('');
      } else {
        console.error('Failed to update message');
        alert('Failed to update message');
      }
    } catch (err) {
      console.error('Error updating message:', err);
      alert('Error updating message');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    setDeleteLoading(messageId);
    try {
      const messageType = type || 'direct';
      const endpoint = messageType === 'direct' 
        ? `${API_BASE_URL}/api/chat/direct/${messageId}`
        : `${API_BASE_URL}/api/chat/group/${messageId}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        console.error('Failed to delete message');
        alert('Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Error deleting message');
    } finally {
      setDeleteLoading(null);
    }
  };

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
    
    const wsUrl = `${protocol}//${window.location.host}/ws?group=${messageType === 'group' ? targetId : ''}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    // Create WebSocket - cookies should be sent automatically
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected successfully');
      console.log('WebSocket ready state:', websocket.readyState);
    };
    
    websocket.onmessage = (event) => {
      try {
        console.log('Raw WebSocket message:', event.data);
        const data = JSON.parse(event.data);
        console.log('Parsed WebSocket message:', data);
        
        // Handle different message types
        if (data.type === 'notification') {
          // Handle notification messages
          console.log('Received notification:', data.notification);
          // You can dispatch this to a notification context if needed
          return;
        }
        
        if (data.type === 'typing') {
          // Handle typing indicators
          console.log('Received typing indicator:', data);
          const messageType = type || 'direct';
          
          if (messageType === 'group' && data.group_id === targetId) {
            // Group typing indicator
            if (data.is_typing) {
              setTypingUsers(prev => {
                const newUsers = [...prev];
                if (!newUsers.includes(data.sender_name)) {
                  newUsers.push(data.sender_name);
                }
                return newUsers;
              });
            } else {
              setTypingUsers(prev => prev.filter(user => user !== data.sender_name));
            }
          } else if (messageType === 'direct' && data.recipient_id === user?.id) {
            // Direct message typing indicator
            if (data.is_typing) {
              setTypingUsers(prev => {
                const newUsers = [...prev];
                if (!newUsers.includes(data.sender_name)) {
                  newUsers.push(data.sender_name);
                }
                return newUsers;
              });
            } else {
              setTypingUsers(prev => prev.filter(user => user !== data.sender_name));
            }
          }
          return;
        }
        
        const messageType = type || 'direct';
        const message = data;
        
        // Check if this is a message for the current conversation
        let shouldAddMessage = false;
        
        if (messageType === 'group') {
          // For group messages, check if group_id matches
          shouldAddMessage = message.type === 'group' && message.group_id === targetId;
        } else {
          // For direct messages, check if it's between the current users
          shouldAddMessage = message.type === 'direct' && 
            ((message.recipient_id === targetId && message.sender_id === user?.id) ||
             (message.sender_id === targetId && message.recipient_id === user?.id));
        }
        
        if (shouldAddMessage) {
          console.log('Message matches criteria, adding to messages');
          // Add is_from_me flag for proper rendering
          const messageWithFlag = {
            ...message,
            is_from_me: message.sender_id === user?.id
          };
          addMessage(messageWithFlag);
        } else {
          console.log('Message does not match criteria, ignoring');
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

    // Clear typing indicator
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
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
        
        // Add message to local state immediately with the real ID from server
        const newMsg = {
          id: responseData.id,
          content: newMessage,
          sender_id: responseData.sender_id,
          sender_name: responseData.sender_name || 'You',
          recipient_id: responseData.recipient_id,
          created_at: responseData.created_at,
          is_from_me: true
        };
        addMessage(newMsg);
        
        // Update message status
        setMessageStatus(prev => ({
          ...prev,
          [responseData.id]: 'sent'
        }));
        
        setNewMessage('');
      } else {
        const errorText = await res.text();
        console.error('Failed to send message:', res.status, errorText);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const sendTypingIndicator = (isTyping) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const messageType = type || 'direct';
      const typingMessage = {
        type: 'typing',
        sender_id: user?.id,
        is_typing: isTyping,
        message_type: messageType
      };
      
      if (messageType === 'group') {
        typingMessage.group_id = targetId;
      } else {
        typingMessage.recipient_id = targetId;
      }
      
      ws.send(JSON.stringify(typingMessage));
    }
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Send typing indicator
    if (value.trim() && ws && ws.readyState === WebSocket.OPEN) {
      if (!isTyping) {
        setIsTyping(true);
        sendTypingIndicator(true);
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingIndicator(false);
      }, 1000);
    } else {
      if (isTyping) {
        setIsTyping(false);
        sendTypingIndicator(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  if (targetId === 'new') {
    return <NewConversation onClose={onClose} onSelectConversation={onSelectConversation} />;
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
                <span className="status-online">🟢 Online</span>
              ) : (
                <span className="status-offline">🔴 Offline (messages will be delivered when they come online)</span>
              )}
              {typingUsers.length > 0 && (
                <span className="typing-indicator">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
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
          messages.map(message => {
            const isOwner = user && message.sender_id === user.id;
            const isEditing = editingMessage === message.id;
            
            return (
              <div
                key={message.id}
                className={`message ${message.is_from_me ? 'message-sent' : 'message-received'}`}
              >
                <div className="message-content">
                  {/* Show sender name for group messages */}
                  {type === 'group' && !message.is_from_me && (
                    <div className="message-sender">
                      {message.sender_name || 'Unknown User'}
                    </div>
                  )}
                  
                  {isEditing ? (
                    <div className="message-edit">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="message-edit-textarea"
                        rows="2"
                        autoFocus
                      />
                      <div className="message-edit-actions">
                        <button
                          onClick={handleSaveEdit}
                          disabled={editLoading || !editText.trim()}
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
                      <div className="message-text">{message.content}</div>
                      <div className="message-time">
                        {formatRelativeTime(message.created_at)}
                      </div>
                    </>
                  )}
                  
                  {/* Edit/Delete buttons for message owner */}
                  {isOwner && !isEditing && (
                    <div className="message-actions">
                      <button
                        onClick={() => handleEditMessage(message)}
                        className="message-action-btn"
                        title="Edit message"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        disabled={deleteLoading === message.id}
                        className="message-action-btn delete"
                        title="Delete message"
                      >
                        {deleteLoading === message.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button
            type="button"
            onClick={toggleEmojiPicker}
            className="emoji-toggle"
            title="Add emoji"
          >
            😀
          </button>
          {showEmojiPicker && (
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
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
