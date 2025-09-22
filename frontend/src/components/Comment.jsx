import { useState } from 'react';
import { useUser } from '../context/useUser';
import { formatRelativeTime, isValidDate } from '../utils/dateUtils';
import { getInitials } from '../utils/avatarUtils';

export default function Comment({ comment, onCommentUpdated, onCommentDeleted }) {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = user && user.id === comment.user_id;

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(comment.text);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(comment.text);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    
    setEditLoading(true);
    try {
      const res = await fetch(`/api/comments?comment_id=${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: editText })
      });
      
      if (res.ok) {
        const updatedComment = { ...comment, text: editText };
        if (onCommentUpdated) onCommentUpdated(updatedComment);
        setIsEditing(false);
      } else {
        console.error('Failed to update comment');
        alert('Failed to update comment');
      }
    } catch (err) {
      console.error('Error updating comment:', err);
      alert('Error updating comment');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/comments?comment_id=${comment.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        if (onCommentDeleted) onCommentDeleted(comment.id);
      } else {
        console.error('Failed to delete comment');
        alert('Failed to delete comment');
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Error deleting comment');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!isValidDate(timestamp)) return 'Invalid Date';
    return formatRelativeTime(timestamp);
  };

  return (
    <div className="comment">
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
        <div className="comment-header">
          <div className="comment-author">
            {comment.first_name} {comment.last_name}
          </div>
          <div className="comment-meta">
            {formatTime(comment.created_at)}
          </div>
          {isOwner && !isEditing && (
            <div className="comment-actions">
              <button
                onClick={handleEdit}
                className="comment-action-btn"
                title="Edit comment"
              >
                ✏️
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="comment-action-btn delete"
                title="Delete comment"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="comment-edit">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="comment-edit-textarea"
              placeholder="Write a comment..."
              rows="2"
            />
            <div className="comment-edit-actions">
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
          </>
        )}
      </div>
      
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Comment</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this comment? This action cannot be undone.</p>
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
