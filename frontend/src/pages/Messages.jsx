import { useState } from 'react';
import Conversations from '../components/Conversations';
import Chat from '../components/Chat';

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);

  const handleSelectConversation = (conversation) => {
    setSelectedChat(conversation);
  };

  const handleCloseChat = () => {
    setSelectedChat(null);
  };

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
