package http

import (
	"database/sql"
	"net/http"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/handlers"
	ws "social-network/backend/internal/websocket"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewRouter returns the base HTTP handler using chi.
func NewRouter(db *sql.DB) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	authHandler := &handlers.AuthHandler{DB: db}
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/me", authHandler.Me)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/logout", authHandler.Logout)
	})

	postsHandler := &handlers.PostsHandler{DB: db}
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/api/posts", postsHandler.CreatePost)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/api/feed", postsHandler.Feed)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/api/comments", postsHandler.AddComment)

	followHandler := &handlers.FollowHandler{DB: db}
	r.Route("/api/follow", func(r chi.Router) {
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/requests/{toUserID}", followHandler.SendRequest)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/requests/{id}/accept", followHandler.AcceptRequest)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/requests/{id}/decline", followHandler.DeclineRequest)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Delete("/{userID}", followHandler.Unfollow)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/followers", followHandler.ListFollowers)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/following", followHandler.ListFollowing)
	})

	profileHandler := &handlers.ProfileHandler{DB: db}
	r.Get("/api/users/{id}/profile", profileHandler.GetProfile)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Patch("/api/me/profile/privacy", profileHandler.TogglePrivacy)

	// WebSocket
	wsHub := ws.NewHub()
	wsHandler := &handlers.WSHandler{DB: db, Hub: wsHub}
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/ws", wsHandler.Serve)

	groupsHandler := &handlers.GroupsHandler{DB: db}
	r.Route("/api/groups", func(r chi.Router) {
		r.Get("/", groupsHandler.ListGroups)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/", groupsHandler.CreateGroup)
		r.Get("/{id}", groupsHandler.GetGroup)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/invite", groupsHandler.Invite)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/invitations/{invID}/accept", groupsHandler.AcceptInvitation)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/invitations/{invID}/decline", groupsHandler.DeclineInvitation)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/requests", groupsHandler.RequestJoin)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/requests/{reqID}/accept", groupsHandler.AcceptRequest)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/requests/{reqID}/decline", groupsHandler.DeclineRequest)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/events", groupsHandler.CreateEvent)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/events/{eventID}/respond", groupsHandler.RespondEvent)
	})

	// Notifications
	nHandler := &handlers.NotificationsHandler{DB: db}
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/api/notifications", nHandler.List)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/api/notifications/read", nHandler.MarkRead)

	return r
}
