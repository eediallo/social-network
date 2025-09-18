-- rollback comment images
DROP INDEX IF EXISTS idx_comment_images_comment;
DROP TABLE IF EXISTS comment_images;
