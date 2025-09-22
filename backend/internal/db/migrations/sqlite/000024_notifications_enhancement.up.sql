-- Add message and action_url columns to notifications table
ALTER TABLE notifications ADD COLUMN message TEXT;
ALTER TABLE notifications ADD COLUMN action_url TEXT;
