import { useState } from 'react';
import ImageUpload from './ImageUpload';

export default function CommentComposer({ postId, onCommentAdded }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const uploadImage = async (image, commentId) => {
    const formData = new FormData();
    formData.append('image', image.file);
    formData.append('comment_id', commentId);

    const res = await fetch('/api/images/comment', {
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
      // First create the comment
      const res = await fetch(`/api/comments?post_id=${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim()
        }),
        credentials: 'include'
      });

      if (res.ok) {
        const newComment = await res.json();
        
        // Upload images if any and collect Cloudinary data
        let uploadedImages = [];
        if (images.length > 0) {
          try {
            console.log('Uploading images for comment:', newComment.id, 'Images:', images);
            const uploadResults = await Promise.all(
              images.map(image => uploadImage(image, newComment.id))
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

        // Use the complete comment data from backend and add images
        const comment = {
          ...newComment,
          images: uploadedImages
        };
        
        console.log('Created comment object:', comment);
        onCommentAdded(comment);
        setText('');
        setImages([]);
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
    <div className="comment-composer">
      <form onSubmit={handleSubmit} className="d-flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          className="form-control"
        />
        
        <ImageUpload
          onImagesChange={setImages}
          images={images}
          maxImages={2}
          disabled={loading}
        />
        
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || (!text.trim() && images.length === 0)}
        >
          {loading ? <span className="loading"></span> : 'Post'}
        </button>
      </form>
      
      {error && <p className="form-error mt-2">{error}</p>}
    </div>
  );
}
