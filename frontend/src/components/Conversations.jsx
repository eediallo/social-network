import { useState, useEffect } from 'react';
import { useUser } from '../context/useUser';
import { getInitials } from '../utils/avatarUtils';
import { formatRelativeTime } from '../utils/dateUtils';

export default function Conversations({ onSelectConversation }) {
  const { user, isAuthenticated } = useUser();
  const [conversations, setConversations] = useState([]);
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
      const res = await fetch('/api/chat/conversations', { credentials: 'include' });
      
      console.log('Conversations response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Conversations data:', data);
        setConversations(data || []);
      } else {
        const errorText = await res.text();
        console.error('Conversations error:', res.status, errorText);
        setError(`Failed to load conversations: ${res.status} ${errorText}`);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(`Failed to load conversations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversation) => {
    onSelectConversation({
      type: conversation.type,
      id: conversation.user_id,
      name: conversation.user_name
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
        <button onClick={fetchConversations} className="btn btn-outline btn-sm">
          Refresh
        </button>
      </div>

      {conversations.length === 0 ? (
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
          {conversations.map(conversation => (
            <div
              key={`${conversation.type}-${conversation.user_id}`}
              className="conversation-item"
              onClick={() => handleConversationClick(conversation)}
            >
              <div className="conversation-avatar">
                {getInitials(conversation.user_name)}
              </div>
              <div className="conversation-content">
                <div className="conversation-header">
                  <h4 className="conversation-name">{conversation.user_name}</h4>
                  <span className="conversation-time">
                    {formatRelativeTime(conversation.last_message_time)}
                  </span>
                </div>
                <div className="conversation-preview">
                  <p className="conversation-message">{conversation.last_message}</p>
                  {conversation.unread_count > 0 && (
                    <span className="conversation-unread">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
