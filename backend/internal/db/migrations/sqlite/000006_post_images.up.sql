-- post images
CREATE TABLE IF NOT EXISTS post_images (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    path TEXT NOT NULL,
    mime TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);

