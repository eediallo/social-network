import { useState } from 'react';
import { useUser } from '../context/useUser';

export default function PostComposer({ onPostCreated }) {
  const { user } = useUser();
  const [text, setText] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          privacy: privacy
        }),
        credentials: 'include'
      });

      if (res.ok) {
        const newPost = await res.json();
        // Create a mock post object for the feed
        const post = {
          id: newPost.id,
          user_id: user.id,
          text: text.trim(),
          privacy: privacy,
          created_at: new Date().toISOString(),
          first_name: user.first_name,
          last_name: user.last_name
        };
        
        onPostCreated(post);
        setText('');
      } else {
        const errorText = await res.text();
        setError(errorText || 'Failed to create post');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-composer">
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`What's on your mind, ${user?.first_name}?`}
          disabled={loading}
        />
        
        <div className="post-composer-actions">
          <div className="d-flex align-center gap-2">
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="form-input"
              style={{ width: 'auto', margin: 0 }}
              disabled={loading}
            >
              <option value="public">🌍 Public</option>
              <option value="followers">👥 Followers</option>
              <option value="selected">👤 Selected</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !text.trim()}
          >
            {loading ? <span className="loading"></span> : 'Post'}
          </button>
        </div>
      </form>
      
      {error && <p className="form-error mt-2">{error}</p>}
    </div>
  );
}