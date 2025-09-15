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

  // Mock data for testing UI improvements
  const mockPosts = [
    {
      id: '1',
      user_id: '1',
      first_name: 'John',
      last_name: 'Doe',
      text: 'This is a sample post to test the UI improvements! The new design looks amazing with proper avatars and date formatting.',
      privacy: 'public',
      created_at: new Date().toISOString(),
      likes: 5,
      comments: 2
    },
    {
      id: '2',
      user_id: '2',
      first_name: 'Jane',
      last_name: 'Smith',
      text: 'Another test post to showcase the beautiful gradient avatars and modern card design. The responsive layout works perfectly!',
      privacy: 'followers',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      likes: 12,
      comments: 8
    },
    {
      id: '3',
      user_id: '3',
      first_name: 'Alex',
      last_name: 'Johnson',
      text: 'Testing the new social network UI! The color palette and typography look professional and modern.',
      privacy: 'public',
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      likes: 3,
      comments: 1
    }
  ];

  const fetchPosts = async () => {
    try {
      console.log('Fetching posts from /api/feed');
      const res = await fetch('/api/feed', { credentials: 'include' });
      console.log('Feed response status:', res.status);
      console.log('Feed response headers:', res.headers);
      if (res.ok) {
        const data = await res.json();
        console.log('Backend feed data:', data);
        // Map backend data to frontend format
        const mappedPosts = data.map(post => ({
          id: post.ID,
          user_id: post.UserID,
          text: post.Text,
          privacy: post.Privacy,
          created_at: post.CreatedAt,
          first_name: post.FirstName || 'User',
          last_name: post.LastName || post.UserID.substring(0, 8),
          likes: 0,
          comments: 0,
          images: post.images || []
        }));
        console.log('Mapped posts:', mappedPosts);
        console.log('First post images:', mappedPosts[0]?.images);
        setPosts(mappedPosts);
      } else {
        console.log('Backend feed failed, status:', res.status);
        console.log('Authentication failed, not using mock data');
        setPosts([]);
      }
    } catch (err) {
      console.log('Network error:', err);
      setPosts([]);
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
