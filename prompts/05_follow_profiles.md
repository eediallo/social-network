### Prompt: Implement followers and profiles privacy

Endpoints:
- POST /api/follow/requests/:to_user_id
- POST /api/follow/requests/:id/accept
- POST /api/follow/requests/:id/decline
- DELETE /api/follow/:user_id (unfollow)
- GET /api/users/:id/profile (respect privacy)
- PATCH /api/me/profile/privacy { public: boolean }
- GET /api/me/followers, GET /api/me/following

Rules:
- Public profiles: follow auto-accept.
- Private profiles: require request flow.
- Profile endpoint hides data for non-followers when private.

