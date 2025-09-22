-- Remove message and action_url columns from notifications table
ALTER TABLE notifications DROP COLUMN message;
ALTER TABLE notifications DROP COLUMN action_url;
