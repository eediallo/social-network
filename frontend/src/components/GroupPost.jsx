import { useState, useEffect } from 'react';
import { getInitials } from '../utils/avatarUtils';
import { formatRelativeTime } from '../utils/dateUtils';
import GroupCommentComposer from './GroupCommentComposer';

export default function GroupPost({ post, groupId }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load initial comment count
  useEffect(() => {
    const loadCommentCount = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/posts/${post.id}/comments`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setCommentCount(data.length);
        }
      } catch (err) {
        console.error('Error loading comment count:', err);
      }
    };
    loadCommentCount();
  }, [post.id, groupId]);

  const toggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts/${post.id}/comments`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data === null || !Array.isArray(data)) {
          setComments([]);
        } else {
          setComments(data);
        }
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = (newComment) => {
    setComments(prev => [...prev, newComment]);
    setCommentCount(prev => prev + 1);
  };

  return (
    <div className="post">
      <div className="post-header">
        <div className="post-avatar">
          {post.avatar_url && post.avatar_url.trim() !== '' ? (
            <img
              src={post.avatar_url}
              alt={`${post.first_name} ${post.last_name}`}
              className="w-full h-full"
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            getInitials(post.first_name, post.last_name)
          )}
        </div>
        <div className="post-author">
          <span className="post-author-name">
            {post.first_name} {post.last_name}
          </span>
          <div className="post-meta">
            <span>{formatRelativeTime(post.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="post-content">
        <div className="post-text">{post.text}</div>
        
        {post.images && post.images.length > 0 && (
          <div className="post-images">
            {post.images.map((image, index) => (
              <img
                key={image.id}
                src={image.url}
                alt={`Post image ${index + 1}`}
                className="post-image"
                loading="lazy"
                onError={(e) => console.error('Post image failed to load:', image.url, e)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="post-actions">
        <button
          onClick={toggleComments}
          className="post-action"
        >
          <span className="icon">💬</span>
          <span className="count">{commentCount}</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <GroupCommentComposer
            groupId={groupId}
            postId={post.id}
            onCommentAdded={handleCommentAdded}
          />
          
          {loading ? (
            <div className="text-center p-3">
              <div className="loading"></div>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-avatar">
                  {comment.avatar_url && comment.avatar_url.trim() !== '' ? (
                    <img
                      src={comment.avatar_url}
                      alt={`${comment.first_name} ${comment.last_name}`}
                      className="w-full h-full"
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(comment.first_name, comment.last_name)
                  )}
                </div>
                <div className="comment-content">
                  <div className="comment-author">
                    {comment.first_name} {comment.last_name}
                  </div>
                  <div className="comment-text">{comment.text}</div>
                  <div className="comment-meta">
                    {formatRelativeTime(comment.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
