### Prompt: Bootstrap Go backend

Create a Go backend with this structure:
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
      migrations/sqlite/
```
Tasks:
- Initialize `go mod`.
- Add deps: `github.com/gorilla/mux` or `chi`, `github.com/gorilla/websocket`, `github.com/mattn/go-sqlite3`, `golang.org/x/crypto/bcrypt`, `github.com/google/uuid`, `github.com/golang-migrate/migrate/v4` (sqlite driver).
- Implement `sqlite.go`: open DB, apply migrations from `file://backend/internal/db/migrations/sqlite`.
- Implement secure session+cookie middleware (HTTPOnly, SameSite=Lax/Strict, Secure if behind TLS).
- Implement base router with health route and static file serving for uploads.
- Provide `.env` support and config struct.

