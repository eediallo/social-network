-- Remove group_tags table
DROP TABLE IF EXISTS group_tags;

-- Remove category column from groups table
-- Note: SQLite doesn't support DROP COLUMN directly, so we'd need to recreate the table
-- For now, we'll just leave the column as it won't cause issues
