-- posts
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    privacy TEXT NOT NULL CHECK (privacy IN ('public','followers','selected')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- selected visibility mapping
CREATE TABLE IF NOT EXISTS post_allowed_followers (
    post_id TEXT NOT NULL,
    follower_user_id TEXT NOT NULL,
    PRIMARY KEY (post_id, follower_user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (follower_user_id) REFERENCES users(id) ON DELETE CASCADE
);

