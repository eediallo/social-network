import { useState } from 'react';
import { useUser } from '../context/useUser';

export default function GroupCommentComposer({ groupId, postId, onCommentAdded }) {
  const { user } = useUser();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/groups/${groupId}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim()
        }),
        credentials: 'include'
      });

      if (res.ok) {
        const newComment = await res.json(); // This returns {id: "..."}

        // Create the complete comment object for the parent component
        const comment = {
          id: newComment.id,
          user_id: user.id,
          text: text.trim(),
          created_at: new Date().toISOString(),
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url || ''
        };

        onCommentAdded(comment);
        setText('');
      } else {
        const errorText = await res.text();
        setError(errorText || 'Failed to create comment');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-composer d-flex flex-column gap-2 mb-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Write a comment, ${user?.first_name || 'User'}...`}
        className="form-input"
        disabled={loading}
        rows="2"
      />

      <button
        type="submit"
        className="btn btn-primary btn-sm align-self-end"
        disabled={loading || !text.trim()}
      >
        {loading ? <span className="loading"></span> : 'Comment'}
      </button>

      {error && <p className="form-error mt-2">{error}</p>}
    </form>
  );
}
