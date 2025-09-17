import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Conversations from '../components/Conversations';
import Chat from '../components/Chat';

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchParams] = useSearchParams();

  const handleSelectConversation = (conversation) => {
    setSelectedChat(conversation);
  };

  const handleCloseChat = () => {
    setSelectedChat(null);
  };

  // Handle URL parameters for opening specific chats
  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId) {
      // Open a direct message with the specified user
      setSelectedChat({
        type: 'direct',
        id: userId,
        name: 'User' // This will be updated when we fetch user details
      });
    }
  }, [searchParams]);

  return (
    <div className="messages-page">
      <div className="messages-container">
        <div className="messages-sidebar">
          <Conversations onSelectConversation={handleSelectConversation} />
        </div>
        
        <div className="messages-main">
          {selectedChat ? (
            <Chat
              type={selectedChat.type}
              targetId={selectedChat.id}
              targetName={selectedChat.name}
              onClose={handleCloseChat}
              onSelectConversation={handleSelectConversation}
            />
          ) : (
            <div className="messages-welcome">
              <div className="welcome-content">
                <h2>Welcome to Messages</h2>
                <p>Select a conversation to start chatting</p>
                <div className="welcome-features">
                  <div className="feature">
                    <span className="feature-icon">💬</span>
                    <span>Direct Messages</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">👥</span>
                    <span>Group Chats</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">⚡</span>
                    <span>Real-time Messaging</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
