import { useState, useRef, useEffect } from 'react';

export default function ImageUpload({ onImagesChange, maxImages = 4, disabled = false, images: externalImages }) {
  const [images, setImages] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Sync with external images state
  useEffect(() => {
    if (externalImages && externalImages.length === 0) {
      setImages([]);
    }
  }, [externalImages]);

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValidType = file.type.startsWith('image/') && 
        ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      
      if (!isValidType) {
        alert('Please select only JPG, PNG, or GIF images.');
        return false;
      }
      if (!isValidSize) {
        alert('Image size must be less than 10MB.');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newImages = validFiles.slice(0, maxImages - images.length).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false,
      error: null
    }));

    setImages(prev => [...prev, ...newImages]);
    onImagesChange([...images, ...newImages]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    handleFiles(files);
  };

  const removeImage = (id) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      onImagesChange(updated);
      return updated;
    });
  };

  const openFileDialog = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="image-upload">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
      {images.length < maxImages && (
        <div
          className={`image-upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <div className="image-upload-content">
            <div className="image-upload-icon">📷</div>
            <p className="image-upload-text">
              {dragActive ? 'Drop images here' : 'Click or drag to upload images'}
            </p>
            <p className="image-upload-hint">
              JPG, PNG, GIF up to 10MB each
            </p>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((image) => (
            <div key={image.id} className="image-preview-item">
              <img
                src={image.preview}
                alt="Preview"
                className="image-preview"
              />
              <button
                type="button"
                className="image-remove-btn"
                onClick={() => removeImage(image.id)}
                disabled={disabled}
              >
                ×
              </button>
              {image.uploading && (
                <div className="image-uploading-overlay">
                  <div className="loading"></div>
                </div>
              )}
              {image.error && (
                <div className="image-error-overlay">
                  <span className="error-text">{image.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
