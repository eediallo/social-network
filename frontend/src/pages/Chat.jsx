import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/useUser';
import { formatRelativeTime } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';

export default function Chat() {
  const { user } = useUser();
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
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
    console.log('Chat useEffect running');
    fetchConversations();
    // Initialize WebSocket with error handling
    try {
      initializeWebSocket();
    } catch (err) {
      console.error('WebSocket initialization error:', err);
      setError('Failed to initialize chat connection');
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const fetchConversations = async () => {
    console.log('fetchConversations called');
    try {
      // For now, we'll use a hardcoded list of known users from our testing
      // In a real app, you'd have a dedicated endpoint for conversations
      const knownUsers = [
        { id: 'f4b25689-70b8-4932-8605-30fabbffb35c', name: 'Commenter User' },
        { id: '02360d70-a9ad-4e74-ac5d-c5733b4619eb', name: 'Test User 2' },
        { id: '784807ef-c60a-4267-8fa7-00675d6339e5', name: 'Test User 3' }
      ];
      
      const conversations = knownUsers.map(user => ({
        id: user.id,
        name: user.name,
        lastMessage: '',
        timestamp: new Date().toISOString(),
        unread: 0,
        type: 'direct'
      }));
      console.log('Setting conversations:', conversations);
      setConversations(conversations);
      console.log('Conversations set successfully');
    } catch (err) {
      console.log('Error fetching conversations, using mock data:', err);
      setConversations(mockConversations);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const initializeWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log('Attempting to connect to WebSocket:', wsUrl);
    
    try {
      const newWs = new WebSocket(wsUrl);
      
      newWs.onopen = () => {
        console.log('WebSocket connected successfully');
        setWs(newWs);
        setError(''); // Clear any previous errors
      };
      
      newWs.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const message = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      newWs.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setWs(null);
        // Only attempt to reconnect if it wasn't a normal closure
        if (event.code !== 1000) {
          setTimeout(initializeWebSocket, 3000);
        }
      };
      
      newWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Chat connection error - messages will not be sent in real-time');
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to initialize chat connection');
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
    }
  }, [selectedConversation]);

  const loadMessages = async () => {
    if (!selectedConversation) return;
    
    try {
      if (selectedConversation.type === 'direct') {
        const res = await fetch(`/api/messages/direct?user_id=${selectedConversation.id}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data)) {
            // Map backend data to frontend format
            const mappedMessages = data.map(msg => ({
              id: msg.id,
              text: msg.text,
              user_id: msg.from_user_id,
              created_at: msg.created_at,
              type: 'direct',
              first_name: 'User', // Default values since backend doesn't return user info
              last_name: msg.from_user_id ? msg.from_user_id.substring(0, 8) : 'Unknown'
            }));
            setMessages(mappedMessages);
          } else {
            setMessages([]);
          }
        }
      } else if (selectedConversation.type === 'group') {
        const res = await fetch(`/api/messages/group?group_id=${selectedConversation.id}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data)) {
            // Map backend data to frontend format
            const mappedMessages = data.map(msg => ({
              id: msg.id,
              text: msg.text,
              user_id: msg.from_user_id,
              created_at: msg.created_at,
              type: 'group',
              first_name: 'User', // Default values since backend doesn't return user info
              last_name: msg.from_user_id ? msg.from_user_id.substring(0, 8) : 'Unknown'
            }));
            setMessages(mappedMessages);
          } else {
            setMessages([]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!ws || !messageText.trim() || !selectedConversation) return;

    const message = {
      type: selectedConversation.type,
      to: selectedConversation.id,
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

  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center mt-5">
          <div className="loading"></div>
          <p>Loading conversations...</p>
          <p>Debug: Loading state is true</p>
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

  console.log('Chat render - loading:', loading, 'conversations:', conversations.length, 'selectedConversation:', selectedConversation);

  // Fallback to ensure something always renders
  if (conversations.length === 0 && !loading) {
    return (
      <div className="container">
        <h1 className="mb-4">Chat</h1>
        <div className="card">
          <div className="card-body text-center">
            <h3>No Conversations</h3>
            <p>No conversations found. This might be a temporary issue.</p>
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
            {conversations.length === 0 ? (
              <div className="text-center p-4">
                <p>No conversations found</p>
                <p>Conversations: {conversations.length}</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div 
                  key={conversation.id} 
                  className={`chat-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                  onClick={() => selectConversation(conversation)}
                >
                  <div className="chat-avatar">
                    {getInitials(conversation.name.split(' ')[0], conversation.name.split(' ')[1] || '')}
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">{conversation.name}</div>
                    <div className="chat-preview">{conversation.lastMessage || 'No messages yet'}</div>
                    <div className="chat-time">{formatRelativeTime(conversation.timestamp)}</div>
                  </div>
                  {conversation.unread > 0 && (
                    <div className="chat-unread">{conversation.unread}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="chat-main">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div className="chat-avatar">{selectedConversation.name[0]}</div>
                <div>
                  <div className="chat-name">{selectedConversation.name}</div>
                  <div className="text-muted">
                    {selectedConversation.type === 'direct' ? 'Direct Message' : 'Group Chat'}
                  </div>
                </div>
              </div>
              
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`chat-message ${
                      message.user_id === 'current_user' ? 'own' : ''
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
                  placeholder={`Message ${selectedConversation.name}...`}
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
