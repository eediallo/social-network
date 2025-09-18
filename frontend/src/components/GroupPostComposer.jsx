import { useState } from 'react';
import { useUser } from '../context/useUser';
import ImageUpload from './ImageUpload';

export default function GroupPostComposer({ groupId, onPostCreated }) {
  const { user } = useUser();
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const uploadImage = async (image, postId) => {
    const formData = new FormData();
    formData.append('image', image.file);
    formData.append('group_post_id', postId);

    const res = await fetch('/api/images/group_post', {
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
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim()
        }),
        credentials: 'include'
      });

      if (res.ok) {
        const newPost = await res.json(); // This returns {id: "..."}

        let uploadedImages = [];
        if (images.length > 0) {
          try {
            const uploadResults = await Promise.all(
              images.map(image => uploadImage(image, newPost.id))
            );
            uploadedImages = uploadResults.map(result => ({
              id: result.id,
              url: result.secure_url || result.url,
              format: result.format
            }));
          } catch (imgError) {
            console.error('Image upload failed:', imgError);
          }
        }

        // Create the complete post object for the parent component
        const post = {
          id: newPost.id,
          user_id: user.id,
          text: text.trim(),
          created_at: new Date().toISOString(),
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url || '',
          images: uploadedImages
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
    <div className="card mb-4">
      <div className="card-body">
        <h4>Create Post</h4>
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`What's happening in this group, ${user?.first_name || 'User'}?`}
              className="form-input"
              disabled={loading}
              rows="3"
            />
          </div>

          <ImageUpload
            onImagesChange={setImages}
            images={images}
            maxImages={4}
            disabled={loading}
          />

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              onClick={() => {
                setText('');
                setImages([]);
              }}
              className="btn btn-secondary"
              disabled={loading}
            >
              Clear
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || (!text.trim() && images.length === 0)}
            >
              {loading ? <span className="loading"></span> : 'Post'}
            </button>
          </div>
        </form>

        {error && <p className="form-error mt-2">{error}</p>}
      </div>
    </div>
  );
}
