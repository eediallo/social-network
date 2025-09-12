-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    public INTEGER NOT NULL DEFAULT 1, -- 1 public, 0 private
    avatar_path TEXT,
    nickname TEXT,
    about TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS profiles_updated_at
AFTER UPDATE ON profiles
FOR EACH ROW BEGIN
    UPDATE profiles SET updated_at = CURRENT_TIMESTAMP WHERE user_id = OLD.user_id;
END;
