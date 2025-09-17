import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Conversations from '../components/Conversations';
import Chat from '../components/Chat';
import API_BASE_URL from '../config/api';

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
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
    const groupId = searchParams.get('group');
    
    if (userId) {
      // Fetch user details to get the real name
      fetchUserDetails(userId);
    } else if (groupId) {
      // Fetch group details to get the real name
      fetchGroupDetails(groupId);
    }
  }, [searchParams]);

  const fetchUserDetails = async (userId) => {
    try {
      setIsLoadingUserDetails(true);
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile?t=${Date.now()}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        const fullName = `${userData.first_name} ${userData.last_name}`;
        setSelectedChat({
          type: 'direct',
          id: userId,
          name: fullName
        });
      } else {
        // Fallback to 'User' if we can't fetch details
        setSelectedChat({
          type: 'direct',
          id: userId,
          name: 'User'
        });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Fallback to 'User' if there's an error
      setSelectedChat({
        type: 'direct',
        id: userId,
        name: 'User'
      });
    } finally {
      setIsLoadingUserDetails(false);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const groupData = await response.json();
        setSelectedChat({
          type: 'group',
          id: groupId,
          name: groupData.title
        });
      } else {
        // Fallback to 'Group' if we can't fetch details
        setSelectedChat({
          type: 'group',
          id: groupId,
          name: 'Group'
        });
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      // Fallback to 'Group' if there's an error
      setSelectedChat({
        type: 'group',
        id: groupId,
        name: 'Group'
      });
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-container">
        <div className="messages-sidebar">
          <Conversations onSelectConversation={handleSelectConversation} />
        </div>
        
        <div className="messages-main">
          {selectedChat ? (
            isLoadingUserDetails ? (
              <div className="chat-loading">
                <div className="loading"></div>
                <p>Loading user details...</p>
              </div>
            ) : (
              <Chat
                type={selectedChat.type}
                targetId={selectedChat.id}
                targetName={selectedChat.name}
                onClose={handleCloseChat}
                onSelectConversation={handleSelectConversation}
              />
            )
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
      
      {/* Floating Action Button for New Conversation */}
      <button 
        className="floating-action-btn"
        onClick={() => handleSelectConversation({ type: 'new', id: 'new', name: 'New Message' })}
        title="Start new conversation"
      >
        <span className="fab-icon">+</span>
      </button>
    </div>
  );
}
