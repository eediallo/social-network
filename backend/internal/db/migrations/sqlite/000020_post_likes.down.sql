-- rollback post likes
DROP INDEX IF EXISTS idx_post_likes_user;
DROP INDEX IF EXISTS idx_post_likes_post;
DROP TABLE IF EXISTS post_likes;
