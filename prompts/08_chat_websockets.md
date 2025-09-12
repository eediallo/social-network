### Prompt: Implement real-time chat with WebSockets

Implement:
- WebSocket hub managing user connections and group rooms.
- Authenticated WS upgrade at `/ws` using session.
- Direct messages: allowed if either user follows the other or recipient has public profile.
- Group chat: members join room `group:{id}`.
- Message persistence to DB with delivered/read status; load recent history on connect.
- Emoji support (UTF-8) and basic rate limiting per connection.

