import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatRelativeTime, isValidDate } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';
import CommentComposer from './CommentComposer';

export default function Post({ post }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [likes, setLikes] = useState(post.likes || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [images, setImages] = useState(post.images || []);
  const [likeLoading, setLikeLoading] = useState(false);

  // Load initial like status and comment count
  useEffect(() => {
    const loadLikeStatus = async () => {
      try {
        const res = await fetch(`/api/posts/likes?post_id=${post.id}`, {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          setLikes(data.likes);
          setIsLiked(data.is_liked);
        }
      } catch (err) {
        console.error('Error loading like status:', err);
      }
    };

    const loadCommentCount = async () => {
      try {
        const res = await fetch(`/api/comments?post_id=${post.id}`, {
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
    
    loadLikeStatus();
    loadCommentCount();
  }, [post.id]);

  const handleCommentAdded = (newComment) => {
    setComments(prev => [...prev, newComment]);
    setCommentCount(prev => prev + 1);
  };

  const handleLike = async () => {
    if (likeLoading) return;
    
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/posts/like?post_id=${post.id}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        setIsLiked(data.is_liked);
      } else {
        console.error('Failed to like post');
      }
    } catch (err) {
      console.error('Error liking post:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/comments?post_id=${post.id}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        // Handle null response or map backend data
        if (data === null || !Array.isArray(data)) {
          setComments([]);
        } else {
          // Backend already returns complete comment data with user info and images
          setComments(data);
        }
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  // Images are now included directly in the post data from the backend
  useEffect(() => {
    setImages(post.images || []);
  }, [post.id, post.images]);

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
          {post.avatar_url && post.avatar_url.trim() !== '' ? (
            <img 
              src={post.avatar_url} 
              alt={`${post.first_name} ${post.last_name}`}
              className="w-full h-full"
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            getInitials(post.first_name, post.last_name) || '?'
          )}
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
        
        {images.length > 0 && (
          <div className="post-images">
            {images.map((image, index) => (
              <img
                key={image.id}
                src={image.url}
                alt={`Post image ${index + 1}`}
                className="post-image"
                loading="lazy"
                onError={(e) => console.error('Image failed to load:', image.url, e)}
              />
            ))}
          </div>
        )}
        
      </div>
      
      <div className="post-actions">
        <button
          onClick={handleLike}
          className={`post-action ${isLiked ? 'active' : ''} ${likeLoading ? 'loading' : ''}`}
          disabled={likeLoading}
        >
          <span className="icon">
            {likeLoading ? (
              <span className="loading"></span>
            ) : (
              isLiked ? '❤️' : '🤍'
            )}
          </span>
          <span className="count">{likes}</span>
        </button>
        
        <button
          onClick={toggleComments}
          className="post-action"
        >
          <span className="icon">💬</span>
          <span className="count">{commentCount}</span>
        </button>
        
        <button className="post-action">
          <span className="icon">🔄</span>
          <span className="count">Share</span>
        </button>
      </div>
      
      {showComments && (
        <div className="comments-section">
          <CommentComposer 
            postId={post.id} 
            onCommentAdded={handleCommentAdded}
          />
          
          {comments.map((comment) => (
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
                
                {comment.images && comment.images.length > 0 && (
                  <div className="comment-images">
                    {comment.images.map((image, index) => (
                      <img
                        key={image.id}
                        src={image.url}
                        alt={`Comment image ${index + 1}`}
                        className="comment-image"
                        loading="lazy"
                        onError={(e) => console.error('Comment image failed to load:', image.url, e)}
                      />
                    ))}
                  </div>
                )}
                
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
