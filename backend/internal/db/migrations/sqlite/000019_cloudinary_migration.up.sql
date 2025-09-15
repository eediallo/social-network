-- Migration to Cloudinary: Update post_images table
-- Add new columns for Cloudinary data
ALTER TABLE post_images ADD COLUMN cloudinary_public_id TEXT;
ALTER TABLE post_images ADD COLUMN cloudinary_url TEXT;
ALTER TABLE post_images ADD COLUMN cloudinary_secure_url TEXT;
ALTER TABLE post_images ADD COLUMN width INTEGER;
ALTER TABLE post_images ADD COLUMN height INTEGER;
ALTER TABLE post_images ADD COLUMN format TEXT;

-- Update profiles table for avatar Cloudinary data
ALTER TABLE profiles ADD COLUMN cloudinary_avatar_public_id TEXT;
ALTER TABLE profiles ADD COLUMN cloudinary_avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN cloudinary_avatar_secure_url TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_post_images_cloudinary ON post_images(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cloudinary_avatar ON profiles(cloudinary_avatar_public_id);
