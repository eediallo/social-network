-- Add category field to groups table
ALTER TABLE groups ADD COLUMN category TEXT DEFAULT 'general';

-- Create group_tags table for multiple tags per group
CREATE TABLE IF NOT EXISTS group_tags (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    UNIQUE(group_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_group_tags_group_id ON group_tags(group_id);
CREATE INDEX IF NOT EXISTS idx_group_tags_tag ON group_tags(tag);

-- Insert some default categories
INSERT OR IGNORE INTO groups (id, owner_user_id, title, description, category) 
SELECT id, owner_user_id, title, description, 'general' 
FROM groups 
WHERE category IS NULL;
