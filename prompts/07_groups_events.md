### Prompt: Implement groups, membership, posts, and events

Endpoints:
- POST /api/groups { title, description }
- GET /api/groups (browse)
- GET /api/groups/:id
- POST /api/groups/:id/invite { user_id }
- POST /api/groups/:id/invitations/:inv_id/accept | /decline
- POST /api/groups/:id/requests (request to join)
- POST /api/groups/:id/requests/:req_id/accept | /decline (owner only)
- POST /api/groups/:id/posts { text, image? }
- POST /api/groups/:id/posts/:post_id/comments { text, image? }
- POST /api/groups/:id/events { title, description, datetime }
- POST /api/groups/:id/events/:event_id/respond { status: going|not_going }

Rules:
- Only members can view group content and post/comment.
- Owner manages join requests; members can invite.

