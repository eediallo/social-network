import { useState } from 'react';
import { useUser } from '../context/useUser';
import ImageUpload from './ImageUpload';
import FollowerSelector from './FollowerSelector';

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
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [showFollowerSelector, setShowFollowerSelector] = useState(false);
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

    return await res.json(); // Returns Cloudinary data
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
          privacy: privacy,
          allowed_follower_ids: privacy === 'selected' ? selectedFollowers : []
        }),
        credentials: 'include'
      });

      if (res.ok) {
        const newPost = await res.json();
        
        // Upload images if any and collect Cloudinary data
        let uploadedImages = [];
        if (images.length > 0) {
          try {
            console.log('Uploading images for post:', newPost.id, 'Images:', images);
            const uploadResults = await Promise.all(
              images.map(image => uploadImage(image, newPost.id))
            );
            console.log('Upload results:', uploadResults);
            uploadedImages = uploadResults.map(result => ({
              id: result.id,
              url: result.secure_url || result.url,
              format: result.format
            }));
            console.log('Mapped uploaded images:', uploadedImages);
          } catch (imgError) {
            console.error('Image upload failed:', imgError);
            // Continue even if image upload fails
          }
        }

        // Create a post object for the feed with Cloudinary URLs
        const post = {
          id: newPost.id,
          user_id: user.id,
          text: text.trim(),
          privacy: privacy,
          created_at: new Date().toISOString(),
          first_name: user.first_name,
          last_name: user.last_name,
          images: uploadedImages
        };
        
        console.log('Created post object:', post);
        onPostCreated(post);
        setText('');
        setImages([]);
        setSelectedFollowers([]);
        setShowFollowerSelector(false);
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
          images={images}
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
              onChange={(e) => {
                setPrivacy(e.target.value);
                if (e.target.value === 'selected') {
                  setShowFollowerSelector(true);
                } else {
                  setShowFollowerSelector(false);
                  setSelectedFollowers([]);
                }
              }}
              disabled={loading}
            >
              <option value="public">Public</option>
              <option value="followers">Followers</option>
              <option value="selected">Selected</option>
            </select>
            {privacy === 'selected' && (
              <button
                type="button"
                onClick={() => setShowFollowerSelector(!showFollowerSelector)}
                className="btn btn-secondary btn-sm"
                disabled={loading}
              >
                {showFollowerSelector ? 'Hide' : 'Select'} Followers ({selectedFollowers.length})
              </button>
            )}
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
      
      {showFollowerSelector && (
        <div className="follower-selector-container">
          <FollowerSelector
            selectedFollowers={selectedFollowers}
            onSelectionChange={setSelectedFollowers}
            disabled={loading}
          />
        </div>
      )}
      
      {error && <p className="form-error mt-2">{error}</p>}
    </div>
  );
}