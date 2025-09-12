### Prompt: Implement site-wide notifications

Notify users on:
- Received follow request (for private profiles)
- Received group invitation
- Group owner received join request
- New group event created (notify members)
- Optional: new comment on your post, accepted follow request, etc.

Endpoints:
- GET /api/notifications (unread first)
- POST /api/notifications/:id/read
- WebSocket push for new notifications.

Design:
- `notifications` table with type, actor_id, subject_ref (polymorphic), created_at, read_at.
- Badge counts in header via periodic poll or WS.

