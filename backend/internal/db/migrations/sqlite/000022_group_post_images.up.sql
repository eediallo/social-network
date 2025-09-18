CREATE TABLE IF NOT EXISTS group_post_images (
    id TEXT PRIMARY KEY,
    group_post_id TEXT NOT NULL,
    path TEXT NOT NULL, -- Stores Cloudinary Public ID
    mime TEXT NOT NULL,
    cloudinary_public_id TEXT,
    cloudinary_url TEXT,
    cloudinary_secure_url TEXT,
    width INTEGER,
    height INTEGER,
    format TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_post_images_group_post_id ON group_post_images(group_post_id);
