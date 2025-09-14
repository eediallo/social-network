import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/useUser';

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

  useEffect(() => {
    // Initialize WebSocket connection
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

  const startDirectChat = (userId) => {
    setCurrentChat({ id: userId, name: `User ${userId}` });
    setChatType('direct');
    setMessages([]);
    // In a real app, you'd fetch message history here
  };

  const startGroupChat = (groupId) => {
    setCurrentChat({ id: groupId, name: `Group ${groupId}` });
    setChatType('group');
    setMessages([]);
    // In a real app, you'd fetch message history here
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
            <div className="chat-item" onClick={() => startDirectChat('user1')}>
              <div className="chat-avatar">U1</div>
              <div className="chat-info">
                <div className="chat-name">User 1</div>
                <div className="chat-preview">Hello there!</div>
              </div>
            </div>
            <div className="chat-item" onClick={() => startDirectChat('user2')}>
              <div className="chat-avatar">U2</div>
              <div className="chat-info">
                <div className="chat-name">User 2</div>
                <div className="chat-preview">How are you?</div>
              </div>
            </div>
            <div className="chat-item" onClick={() => startGroupChat('group1')}>
              <div className="chat-avatar">G1</div>
              <div className="chat-info">
                <div className="chat-name">Group 1</div>
                <div className="chat-preview">Group discussion</div>
              </div>
            </div>
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
                      message.from_user_id === user?.id ? 'own' : ''
                    }`}
                  >
                    <div className="chat-message-avatar">
                      {message.from_user_id === user?.id ? 'Me' : 'U'}
                    </div>
                    <div className="chat-message-content">
                      <div className="chat-message-text">{message.text}</div>
                      <div className="chat-message-time">
                        {new Date().toLocaleTimeString()}
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
