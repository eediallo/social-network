import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatRelativeTime, isValidDate } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';
import CommentComposer from './CommentComposer';
import Comment from './Comment';
import { useUser } from '../context/useUser';

export default function Post({ post, onPostUpdated, onPostDeleted }) {
  const { user } = useUser();
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [likes, setLikes] = useState(post.likes || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [images, setImages] = useState(post.images || []);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editPrivacy, setEditPrivacy] = useState(post.privacy);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
          // Handle null response or ensure data is an array
          if (data === null || !Array.isArray(data)) {
            setCommentCount(0);
          } else {
            setCommentCount(data.length);
          }
        }
      } catch (err) {
        console.error('Error loading comment count:', err);
        setCommentCount(0);
      }
    };
    
    loadLikeStatus();
    loadCommentCount();
  }, [post.id]);

  const handleCommentAdded = (newComment) => {
    setComments(prev => [...prev, newComment]);
    setCommentCount(prev => prev + 1);
  };

  const handleCommentUpdated = (updatedComment) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === updatedComment.id ? updatedComment : comment
      )
    );
  };

  const handleCommentDeleted = (commentId) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
    setCommentCount(prev => Math.max(0, prev - 1));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(post.text);
    setEditPrivacy(post.privacy);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(post.text);
    setEditPrivacy(post.privacy);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    
    setEditLoading(true);
    try {
      const res = await fetch(`/api/posts?post_id=${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: editText,
          privacy: editPrivacy,
          allowed_follower_ids: [] // For now, not implementing selected privacy in edit
        })
      });
      
      if (res.ok) {
        const updatedPost = { ...post, text: editText, privacy: editPrivacy };
        if (onPostUpdated) onPostUpdated(updatedPost);
        setIsEditing(false);
      } else {
        console.error('Failed to update post');
        alert('Failed to update post');
      }
    } catch (err) {
      console.error('Error updating post:', err);
      alert('Error updating post');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/posts?post_id=${post.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        if (onPostDeleted) onPostDeleted(post.id);
      } else {
        console.error('Failed to delete post');
        alert('Failed to delete post');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Error deleting post');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const isOwner = user && user.id === post.user_id;

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
        
        {isOwner && !isEditing && (
          <div className="post-actions-menu">
            <button
              onClick={handleEdit}
              className="post-action-btn"
              title="Edit post"
            >
              ✏️
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="post-action-btn delete"
              title="Delete post"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      
      <div className="post-content">
        {isEditing ? (
          <div className="post-edit">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="post-edit-textarea"
              placeholder="What's on your mind?"
              rows="3"
            />
            <div className="post-edit-privacy">
              <select
                value={editPrivacy}
                onChange={(e) => setEditPrivacy(e.target.value)}
                className="post-edit-select"
              >
                <option value="public">🌍 Public</option>
                <option value="followers">👥 Followers</option>
                <option value="selected">👤 Selected</option>
              </select>
            </div>
            <div className="post-edit-actions">
              <button
                onClick={handleSaveEdit}
                disabled={editLoading || !editText.trim()}
                className="btn btn-primary btn-sm"
              >
                {editLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={editLoading}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
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
            <Comment
              key={comment.id}
              comment={comment}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      )}
      
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Post</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this post? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="btn btn-danger"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
