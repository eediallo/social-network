-- Rollback Cloudinary migration
-- Remove Cloudinary columns from post_images
ALTER TABLE post_images DROP COLUMN cloudinary_public_id;
ALTER TABLE post_images DROP COLUMN cloudinary_url;
ALTER TABLE post_images DROP COLUMN cloudinary_secure_url;
ALTER TABLE post_images DROP COLUMN width;
ALTER TABLE post_images DROP COLUMN height;
ALTER TABLE post_images DROP COLUMN format;

-- Remove Cloudinary columns from profiles
ALTER TABLE profiles DROP COLUMN cloudinary_avatar_public_id;
ALTER TABLE profiles DROP COLUMN cloudinary_avatar_url;
ALTER TABLE profiles DROP COLUMN cloudinary_avatar_secure_url;

-- Drop indexes
DROP INDEX IF EXISTS idx_post_images_cloudinary;
DROP INDEX IF EXISTS idx_profiles_cloudinary_avatar;
