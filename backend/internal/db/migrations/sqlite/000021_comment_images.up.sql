-- comment images
CREATE TABLE IF NOT EXISTS comment_images (
    id TEXT PRIMARY KEY,
    comment_id TEXT NOT NULL,
    path TEXT,
    mime TEXT,
    cloudinary_public_id TEXT,
    cloudinary_url TEXT,
    cloudinary_secure_url TEXT,
    format TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comment_images_comment ON comment_images(comment_id);
