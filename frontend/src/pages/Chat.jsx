import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/useUser';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';

export default function Chat() {
  const { user } = useUser();
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [chatType, setChatType] = useState('direct'); // 'direct' or 'group'
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Mock data for testing UI
  const mockConversations = [
    {
      id: '1',
      type: 'direct',
      name: 'John Doe',
      lastMessage: 'Hey, how are you doing?',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 2,
      user: { first_name: 'John', last_name: 'Doe' }
    },
    {
      id: '2',
      type: 'direct',
      name: 'Jane Smith',
      lastMessage: 'Thanks for the help!',
      lastMessageTime: new Date(Date.now() - 1800000).toISOString(),
      unreadCount: 0,
      user: { first_name: 'Jane', last_name: 'Smith' }
    },
    {
      id: '3',
      type: 'group',
      name: 'Tech Enthusiasts',
      lastMessage: 'Alex: Check out this new framework!',
      lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
      unreadCount: 5,
      user: { first_name: 'Tech', last_name: 'Enthusiasts' }
    }
  ];

  const mockMessages = [
    {
      id: '1',
      text: 'Hey, how are you doing?',
      user_id: '2',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date().toISOString(),
      type: 'direct'
    },
    {
      id: '2',
      text: 'I\'m doing great! Thanks for asking. How about you?',
      user_id: '1',
      first_name: 'Test',
      last_name: 'User',
      created_at: new Date(Date.now() - 300000).toISOString(),
      type: 'direct'
    },
    {
      id: '3',
      text: 'Pretty good! Just working on some new projects.',
      user_id: '2',
      first_name: 'John',
      last_name: 'Doe',
      created_at: new Date(Date.now() - 180000).toISOString(),
      type: 'direct'
    }
  ];

  useEffect(() => {
    // Use mock data for UI testing
    setMessages(mockMessages);
    setLoading(false);
    
    // Initialize WebSocket connection (commented out for UI testing)
    /*
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const newWs = new WebSocket(wsUrl);
      
      newWs.onopen = () => {
        console.log('WebSocket connected');
        setWs(newWs);
        setLoading(false);
      };
      
      newWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages(prev => [...prev, message]);
      };
      
      newWs.onclose = () => {
        console.log('WebSocket disconnected');
        setWs(null);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      newWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
      };
    };

    connectWebSocket();
    */

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!ws || !messageText.trim() || !currentChat) return;

    const message = {
      type: chatType,
      to: currentChat.id,
      text: messageText.trim()
    };

    ws.send(JSON.stringify(message));
    setMessageText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startDirectChat = (conversation) => {
    setCurrentChat(conversation);
    setChatType('direct');
    setMessages(mockMessages);
  };

  const startGroupChat = (conversation) => {
    setCurrentChat(conversation);
    setChatType('group');
    setMessages(mockMessages);
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

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <div className="card-body text-center">
            <h3>Connection Error</h3>
            <p className="text-error">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="mb-4">Chat</h1>
      
      <div className="chat-container">
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3 className="chat-sidebar-title">Conversations</h3>
          </div>
          <div className="chat-list">
            {mockConversations.map((conversation) => (
              <div 
                key={conversation.id} 
                className={`chat-item ${currentChat?.id === conversation.id ? 'active' : ''}`}
                onClick={() => conversation.type === 'direct' ? startDirectChat(conversation) : startGroupChat(conversation)}
              >
                <div className="chat-avatar">
                  {getInitials(conversation.user.first_name, conversation.user.last_name)}
                </div>
                <div className="chat-info">
                  <div className="chat-name">{conversation.name}</div>
                  <div className="chat-preview">{conversation.lastMessage}</div>
                  <div className="chat-time">{formatRelativeTime(conversation.lastMessageTime)}</div>
                </div>
                {conversation.unreadCount > 0 && (
                  <div className="chat-unread">{conversation.unreadCount}</div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="chat-main">
          {currentChat ? (
            <>
              <div className="chat-header">
                <div className="chat-avatar">{currentChat.name[0]}</div>
                <div>
                  <div className="chat-name">{currentChat.name}</div>
                  <div className="text-muted">
                    {chatType === 'direct' ? 'Direct Message' : 'Group Chat'}
                  </div>
                </div>
              </div>
              
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`chat-message ${
                      message.user_id === user?.id ? 'own' : ''
                    }`}
                  >
                    <div className="chat-message-avatar">
                      {getInitials(message.first_name, message.last_name)}
                    </div>
                    <div className="chat-message-content">
                      <div className="chat-message-text">{message.text}</div>
                      <div className="chat-message-time">
                        {formatRelativeTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="chat-input">
                <input
                  type="text"
                  placeholder={`Message ${currentChat.name}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!ws}
                />
                <button
                  onClick={sendMessage}
                  disabled={!ws || !messageText.trim()}
                  className="btn btn-primary"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="d-flex justify-center align-center h-full">
              <div className="text-center">
                <h3>Select a conversation</h3>
                <p>Choose a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
