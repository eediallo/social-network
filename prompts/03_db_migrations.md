### Prompt: Write SQLite migrations

Produce `.up.sql` and `.down.sql` files under `backend/internal/db/migrations/sqlite` for:
- 000001_users
- 000002_profiles
- 000003_sessions
- 000004_follows_and_requests
- 000005_posts
- 000006_post_images
- 000007_comments
- 000008_groups
- 000009_group_members
- 000010_group_invitations
- 000011_group_requests
- 000012_events
- 000013_event_responses
- 000014_direct_messages
- 000015_group_messages
- 000016_notifications

Include constraints, foreign keys, unique indexes, and helpful composite indexes for queries (e.g., feed by follower relationships, group membership lookups, unread counts).

