import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatRelativeTime, isValidDate } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';

export default function Post({ post }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment.trim(),
          post_id: post.id
        }),
        credentials: 'include'
      });

      if (res.ok) {
        const comment = await res.json();
        setComments(prev => [...prev, {
          id: comment.id,
          text: newComment.trim(),
          user_id: 'current_user', // In real app, get from context
          created_at: new Date().toISOString()
        }]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
  };

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/comments?post_id=${post.id}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case 'public': return '🌍';
      case 'followers': return '👥';
      case 'selected': return '👤';
      default: return '🔒';
    }
  };

  const formatTime = (timestamp) => {
    if (!isValidDate(timestamp)) return 'Invalid Date';
    return formatRelativeTime(timestamp);
  };

  return (
    <div className="post">
      <div className="post-header">
        <div className="post-avatar">
          {getInitials(post.first_name, post.last_name) || '?'}
        </div>
        <div className="post-author">
          <Link
            to={`/profile/${post.user_id}`}
            className="post-author-name"
          >
            {post.first_name} {post.last_name}
          </Link>
          <div className="post-meta">
            <span>{formatTime(post.created_at)}</span>
            <span className="privacy-icon">{getPrivacyIcon(post.privacy)}</span>
            <span className="privacy-text">{post.privacy}</span>
          </div>
        </div>
      </div>
      
      <div className="post-content">
        <div className="post-text">{post.text}</div>
      </div>
      
      <div className="post-actions">
        <button
          onClick={handleLike}
          className={`post-action ${isLiked ? 'active' : ''}`}
        >
          <span className="icon">{isLiked ? '❤️' : '🤍'}</span>
          <span className="count">{likes}</span>
        </button>
        
        <button
          onClick={toggleComments}
          className="post-action"
        >
          <span className="icon">💬</span>
          <span className="count">{comments.length}</span>
        </button>
        
        <button className="post-action">
          <span className="icon">🔄</span>
          <span className="count">Share</span>
        </button>
      </div>
      
      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleAddComment} className="d-flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="form-input"
              disabled={commentLoading}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={commentLoading || !newComment.trim()}
            >
              {commentLoading ? <span className="loading"></span> : 'Post'}
            </button>
          </form>
          
          {comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-avatar">
                {comment.user_id === 'current_user' ? 'Me' : 'U'}
              </div>
              <div className="comment-content">
                <div className="comment-author">
                  {comment.user_id === 'current_user' ? 'You' : 'User'}
                </div>
                <div className="comment-text">{comment.text}</div>
                <div className="comment-meta">
                  {formatTime(comment.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
