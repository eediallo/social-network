import { useState, useEffect } from 'react';
import PostComposer from '../components/PostComposer';
import Post from '../components/Post';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/feed', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center mt-5">
          <div className="loading"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="feed-container">
        <PostComposer onPostCreated={handlePostCreated} />
        
        {error && (
          <div className="card mb-3">
            <div className="card-body text-center">
              <p className="text-error">{error}</p>
              <button 
                onClick={fetchPosts}
                className="btn btn-primary btn-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {posts.length === 0 && !error && (
          <div className="card">
            <div className="card-body text-center">
              <h3>No posts yet</h3>
              <p>Be the first to share something!</p>
            </div>
          </div>
        )}
        
        {posts.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
