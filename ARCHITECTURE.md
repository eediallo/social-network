### Architecture Overview

Backend: Go service with HTTP API, sessions/cookies auth, SQLite via migrations, and WebSocket hub for chat/notifications.

Frontend: Next.js (TS) SPA/SSR hybrid consuming the API, with WebSocket client for real-time features.

Data: SQLite schema for users, profiles, sessions, follows/requests, posts, comments, groups, invitations/requests, events, event_responses, messages (direct/group), notifications.

Containers: Separate Docker images for backend and frontend. Compose for local dev, reverse proxy optional later.

Security: bcrypt, cookie flags, CSRF strategy, input validation, upload validation, CORS.

Structure (backend):
```
backend/
  cmd/server/main.go
  internal/
    http/router.go
    http/middleware/
    handlers/
    auth/
    websocket/
    images/
    config/
    log/
    db/
      sqlite.go
      migrations/
        sqlite/
```

Next steps: scaffold backend, init Go module, create migrations skeleton, then implement auth and sessions.

