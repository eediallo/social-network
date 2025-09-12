### Prompt: Implement posts, comments, images, and privacy feed

Endpoints:
- POST /api/posts { text, privacy, allowed_follower_ids?, image? }
- GET /api/feed (based on privacy rules: public, followers, selected followers)
- GET /api/users/:id/posts (respect profile and post privacy)
- POST /api/posts/:id/comments { text, image? }
- GET /api/posts/:id

Implementation details:
- Validate image types (jpeg/png/gif) and max size. Store files on disk with unique names.
- Privacy enum: public, followers, selected.
- Efficient queries with joins to follows to compute visibility.

