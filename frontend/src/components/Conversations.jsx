import { useState, useEffect } from 'react';
import { getInitials } from '../utils/avatarUtils';
import { formatRelativeTime } from '../utils/dateUtils';

export default function Conversations({ onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/chat/conversations', { credentials: 'include' });
      
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      } else {
        setError('Failed to load conversations');
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
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
          <p>No conversations yet</p>
          <p className="text-muted">Start chatting with your friends!</p>
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
