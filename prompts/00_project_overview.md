### Goal
Build a Facebook-like social network with authentication, followers, profiles (public/private), posts with privacy, groups and events, real-time chat via WebSockets, image uploads, notifications, migrations with SQLite, and Dockerized backend/frontend.

### Constraints
- Backend: Go, SQLite, sessions+cookies, migrations, WebSockets.
- Frontend: Any JS framework (e.g., Next.js), responsive UI.
- Docker: separate images for backend and frontend.
- Image types: JPEG, PNG, GIF.

### Deliverables
- Functional backend API with auth, followers, profiles, posts, groups, chat, notifications.
- Frontend implementing all user flows.
- SQLite migrations and seed data.
- Dockerfiles and compose to run end-to-end.

### Acceptance
- All features work with private/public rules and real-time messaging.
- Sessions persist until logout; cookies secure.
- Images upload and render.
- Notifications distinct from messages and visible site-wide.

