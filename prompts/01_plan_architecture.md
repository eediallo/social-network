### Prompt: Plan architecture

You are a senior full-stack architect. Propose a concrete architecture for this project:
- Backend in Go: modules/packages, folder layout, main server, router, middleware, handlers, services, repositories, models. Include session+cookie strategy, WebSocket hub, image storage strategy, config management, logging.
- Database schema (SQLite): tables for users, sessions, follow_requests, follows, profiles, posts, post_privacy, post_images, comments, groups, group_members, group_invitations, group_requests, events, event_responses, messages (direct), group_messages, notifications. Include fields, constraints, indexes, and relationships. Provide an ER diagram textual description.
- Migrations strategy and file naming/versioning, and seed data approach.
- Frontend app structure with chosen framework (recommend Next.js App Router): pages/routes, layouts, global state, API client, auth guards, components for feeds, profiles, groups, chat, notifications. SSR/ISR/CSR split.
- Docker strategy: two images, multi-stage builds, environment variables, networking, volumes for uploads, ports.
- Security: password hashing (bcrypt), CSRF, session fixation, HTTPS proxy, CORS, input validation, file upload validation.
- Scalability: how to later swap SQLite, background jobs, pagination, rate limiting.
- Deliver a concise diagram and a step-by-step implementation roadmap.

