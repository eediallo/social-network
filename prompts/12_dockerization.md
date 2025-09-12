### Prompt: Dockerize backend and frontend

Create:
- `backend/Dockerfile`: multi-stage build for Go server; exposes backend port; mounts volume for uploads.
- `frontend/Dockerfile`: multi-stage build for Next.js; serves via node runtime; exposes 3000.
- `docker-compose.yml`: services `backend`, `frontend`; network; env vars; volumes; port mappings.

Ensure backend URL is configurable for frontend. Confirm sessions via cookies work across containers.

