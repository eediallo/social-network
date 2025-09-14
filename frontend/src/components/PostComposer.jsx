import { useState } from 'react';
import { useUser } from '../context/useUser';
import ImageUpload from './ImageUpload';

export default function PostComposer({ onPostCreated }) {
  const { user } = useUser();
  
  // Mock user for testing UI improvements
  const mockUser = user || {
    id: '1',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com'
  };
  const [text, setText] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const uploadImage = async (image, postId) => {
    const formData = new FormData();
    formData.append('image', image.file);
    formData.append('post_id', postId);

    const res = await fetch('/api/images/post', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Failed to upload image');
    }

    return await res.text(); // Returns filename
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && images.length === 0) return;

    setLoading(true);
    setError('');

    try {
      // First create the post
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
        
        // Upload images if any
        if (images.length > 0) {
          try {
            await Promise.all(
              images.map(image => uploadImage(image, newPost.id))
            );
          } catch (imgError) {
            console.error('Image upload failed:', imgError);
            // Continue even if image upload fails
          }
        }

        // Create a mock post object for the feed
        const post = {
          id: newPost.id,
          user_id: user.id,
          text: text.trim(),
          privacy: privacy,
          created_at: new Date().toISOString(),
          first_name: user.first_name,
          last_name: user.last_name,
          images: images.map(img => ({
            id: img.id,
            filename: img.file.name,
            preview: img.preview
          }))
        };
        
        onPostCreated(post);
        setText('');
        setImages([]);
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
          placeholder={`What's on your mind, ${mockUser.first_name}?`}
          disabled={loading}
        />
        
        <ImageUpload
          onImagesChange={setImages}
          maxImages={4}
          disabled={loading}
        />
        
        <div className="post-composer-actions">
          <div className="privacy-selector">
            <span className="privacy-icon">
              {privacy === 'public' ? '🌍' : privacy === 'followers' ? '👥' : '👤'}
            </span>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              disabled={loading}
            >
              <option value="public">Public</option>
              <option value="followers">Followers</option>
              <option value="selected">Selected</option>
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