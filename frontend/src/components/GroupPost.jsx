import { useState, useEffect } from 'react';
import { getInitials } from '../utils/avatarUtils';
import { formatRelativeTime } from '../utils/dateUtils';
import GroupCommentComposer from './GroupCommentComposer';
import GroupComment from './GroupComment';
import { useUser } from '../context/useUser';

export default function GroupPost({ post, groupId, onPostUpdated, onPostDeleted }) {
  const { user } = useUser();
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load initial comment count
  useEffect(() => {
    const loadCommentCount = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/posts/${post.id}/comments`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setCommentCount(Array.isArray(data) ? data.length : 0);
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
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(post.text);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;

    setEditLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: editText })
      });

      if (res.ok) {
        const updatedPost = { ...post, text: editText };
        if (onPostUpdated) onPostUpdated(updatedPost);
        setIsEditing(false);
      } else {
        console.error('Failed to update group post');
        alert('Failed to update group post');
      }
    } catch (err) {
      console.error('Error updating group post:', err);
      alert('Error updating group post');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts/${post.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        if (onPostDeleted) onPostDeleted(post.id);
      } else {
        console.error('Failed to delete group post');
        alert('Failed to delete group post');
      }
    } catch (err) {
      console.error('Error deleting group post:', err);
      alert('Error deleting group post');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const isOwner = user && user.id === post.user_id;

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
          </>
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
              <GroupComment
                key={comment.id}
                comment={comment}
                groupId={groupId}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
              />
            ))
          )}
        </div>
      )}
      
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Group Post</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this group post? This action cannot be undone.</p>
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
