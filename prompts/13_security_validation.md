### Prompt: Security hardening and validation

Backend:
- Hash passwords with bcrypt, parameterize cost.
- Input validation and normalization; central error handling with safe messages.
- CSRF protection for state-changing requests (double submit cookie or SameSite+token for SPA).
- CORS minimal allowlist for frontend origin.
- File uploads: MIME sniffing, size limits, randomized filenames, dedicated uploads dir.
- Session fixation protection (rotate on login), idle/absolute timeouts.
- Rate limiting for auth and messaging.

Frontend:
- Sanitize/escape user content where rendered; avoid dangerous HTML.

