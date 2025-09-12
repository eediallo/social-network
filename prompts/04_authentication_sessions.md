### Prompt: Implement authentication with sessions and cookies

Implement endpoints:
- POST /api/auth/register: email, password, first_name, last_name, date_of_birth, avatar(optional), nickname(optional), about(optional). Validate, hash password (bcrypt), store.
- POST /api/auth/login: email+password -> create session, set cookie.
- POST /api/auth/logout: destroy session, clear cookie.
- GET /api/auth/me: returns current user and profile.

Session details:
- Store sessions in DB with user_id, session_id (uuid), created_at, expires_at, user_agent, ip.
- Cookie flags: HttpOnly, SameSite=Lax or Strict, Secure in prod, Path=/, short name like `sid`.
- Middleware to load session and set context.

Avatar upload handling for registration or profile update: validate MIME (jpeg/png/gif), limit size, store on disk, save path in DB.

