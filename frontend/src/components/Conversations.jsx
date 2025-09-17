import { useState, useEffect } from 'react';
import { useUser } from '../context/useUser';
import { getInitials } from '../utils/avatarUtils';
import { formatRelativeTime } from '../utils/dateUtils';
import API_BASE_URL from '../config/api';

export default function Conversations({ onSelectConversation }) {
  const { user, isAuthenticated } = useUser();
  const [directConversations, setDirectConversations] = useState([]);
  const [groupConversations, setGroupConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Conversations component - isAuthenticated:', isAuthenticated, 'user:', user);
    if (isAuthenticated) {
      fetchConversations();
    } else {
      setLoading(false);
      setError('Please log in to view conversations');
    }
  }, [isAuthenticated]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching conversations...');
      
      // Fetch both direct and group conversations in parallel
      const [directRes, groupRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/chat/conversations`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/chat/group-conversations`, { credentials: 'include' })
      ]);
      
      console.log('Direct conversations response status:', directRes.status);
      console.log('Group conversations response status:', groupRes.status);
      
      if (directRes.ok && groupRes.ok) {
        const directData = await directRes.json();
        const groupData = await groupRes.json();
        console.log('Direct conversations data:', directData);
        console.log('Group conversations data:', groupData);
        setDirectConversations(directData || []);
        setGroupConversations(groupData || []);
      } else {
        const directError = directRes.ok ? '' : await directRes.text();
        const groupError = groupRes.ok ? '' : await groupRes.text();
        console.error('Conversations error:', directRes.status, groupRes.status, directError, groupError);
        setError(`Failed to load conversations: ${directRes.status} ${groupRes.status}`);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(`Failed to load conversations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectConversationClick = (conversation) => {
    onSelectConversation({
      type: 'direct',
      id: conversation.user_id,
      name: conversation.user_name
    });
  };

  const handleGroupConversationClick = (conversation) => {
    onSelectConversation({
      type: 'group',
      id: conversation.group_id,
      name: conversation.group_name
    });
  };

  if (loading) {
    return (
      <div className="conversations">
        <div className="conversations-header">
          <h3>Messages</h3>
        </div>
        <div className="conversations-loading">
          <div className="loading"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversations">
        <div className="conversations-header">
          <h3>Messages</h3>
        </div>
        <div className="conversations-error">
          <p>{error}</p>
          <button onClick={fetchConversations} className="btn btn-primary btn-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conversations">
      <div className="conversations-header">
        <h3>Messages</h3>
        <div className="conversations-actions">
          <button 
            onClick={() => onSelectConversation({ type: 'new', id: 'new', name: 'New Message' })}
            className="btn btn-primary btn-sm new-conversation-btn"
            title="Start new conversation"
          >
            <span className="btn-icon">+</span>
            New
          </button>
          <button onClick={fetchConversations} className="btn btn-outline btn-sm">
            Refresh
          </button>
        </div>
      </div>

      {directConversations.length === 0 && groupConversations.length === 0 ? (
        <div className="conversations-empty">
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h4>No conversations yet</h4>
            <p>Start a new conversation with someone</p>
            <button 
              onClick={() => onSelectConversation({ type: 'new', id: 'new', name: 'New Message' })}
              className="btn btn-primary btn-sm"
            >
              Start New Message
            </button>
          </div>
        </div>
      ) : (
        <div className="conversations-list">
          {/* Group Conversations */}
          {groupConversations.length > 0 && (
            <>
              <div className="conversations-section-header">
                <h4>Group Chats</h4>
              </div>
              {groupConversations.map(conversation => (
                <div
                  key={`group-${conversation.group_id}`}
                  className="conversation-item group-conversation"
                  onClick={() => handleGroupConversationClick(conversation)}
                >
                  <div className="conversation-avatar group-avatar">
                    👥
                  </div>
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <h4 className="conversation-name">{conversation.group_name}</h4>
                      <span className="conversation-time">
                        {formatRelativeTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      <p className="conversation-message">Group chat</p>
                      {conversation.unread_count > 0 && (
                        <span className="conversation-unread">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Direct Conversations */}
          {directConversations.length > 0 && (
            <>
              <div className="conversations-section-header">
                <h4>Direct Messages</h4>
              </div>
              {directConversations.map(conversation => (
                <div
                  key={`direct-${conversation.user_id}`}
                  className="conversation-item"
                  onClick={() => handleDirectConversationClick(conversation)}
                >
                  <div className="conversation-avatar">
                    {getInitials(conversation.user_name)}
                  </div>
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <h4 className="conversation-name">{conversation.user_name}</h4>
                      <span className="conversation-time">
                        {formatRelativeTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      <p className="conversation-message">{conversation.last_message || 'No messages yet'}</p>
                      {conversation.unread_count > 0 && (
                        <span className="conversation-unread">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
