package http

import (
	"database/sql"
	"net/http"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/handlers"

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

	return r
}
