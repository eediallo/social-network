package http

import (
	"database/sql"
	"log"
	"net/http"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/config"
	"social-network/backend/internal/handlers"
	"social-network/backend/internal/services"
	ws "social-network/backend/internal/websocket"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter returns the base HTTP handler using chi.
func NewRouter(db *sql.DB) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Attach session to context when present (optional): useful for public endpoints
	r.Use(auth.LoadSession(db))

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

	// Initialize Cloudinary service
	cloudinaryCfg := config.LoadCloudinaryConfig()
	secretPreview := cloudinaryCfg.APISecret
	if len(secretPreview) > 8 {
		secretPreview = secretPreview[:8] + "..."
	}
	log.Printf("Cloudinary config loaded: CloudName=%s, APIKey=%s, APISecret=%s",
		cloudinaryCfg.CloudName, cloudinaryCfg.APIKey, secretPreview)

	cloudinarySvc, err := services.NewCloudinaryService(cloudinaryCfg)
	if err != nil {
		log.Printf("Warning: Cloudinary not configured: %v", err)
		// Continue without Cloudinary - will fall back to local storage
	} else {
		log.Printf("Cloudinary service initialized successfully")
	}

	imagesHandler := &handlers.ImagesHandler{DB: db, CloudinarySvc: cloudinarySvc}
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/api/images/avatar", imagesHandler.UploadAvatar)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/api/images/post", imagesHandler.UploadPostImage)
	postsHandler := &handlers.PostsHandler{DB: db}
	// Static file serving for images
	r.Get("/images/{filename}", func(w http.ResponseWriter, r *http.Request) {
		filename := chi.URLParam(r, "filename")
		// Set CORS headers for static files
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Expose-Headers", "Link")
		http.ServeFile(w, r, "internal/images/"+filename)
	})
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/api/posts", postsHandler.CreatePost)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/api/feed", postsHandler.Feed)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/api/posts/user", postsHandler.GetUserPosts)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/api/posts/images", postsHandler.GetPostImages)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/api/comments", postsHandler.AddComment)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/api/comments", postsHandler.ListComments)

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
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Patch("/api/me/profile", profileHandler.UpdateProfile)

	// WebSocket
	wsHub := ws.NewHub()
	wsHandler := &handlers.WSHandler{DB: db, Hub: wsHub}
	chatHandler := &handlers.ChatHandler{DB: db, Hub: wsHub}
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/ws", wsHandler.Serve)

	// Chat API routes
	r.Route("/api/chat", func(r chi.Router) {
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/direct", chatHandler.SendDirectMessage)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/direct/{userId}", chatHandler.ListDirectMessages)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/group/{id}", chatHandler.SendGroupMessage)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/group/{id}", chatHandler.ListGroupMessages)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/read/{messageId}", chatHandler.MarkMessageAsRead)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/conversations", chatHandler.GetConversations)
	})

	groupsHandler := &handlers.GroupsHandler{DB: db}
	groupEventsHandler := &handlers.GroupEventsHandler{DB: db}
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
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/events", groupEventsHandler.CreateEvent)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/{id}/events", groupEventsHandler.ListEvents)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/events/{eventId}/respond", groupEventsHandler.RespondToEvent)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/{id}/events/{eventId}/responses", groupEventsHandler.GetEventResponses)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/{id}/members", groupsHandler.ListMembers)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/invitations/sent", groupsHandler.ListSentInvitations)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/invitations/received", groupsHandler.ListReceivedInvitations)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/search/users", groupsHandler.SearchUsers)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/{id}/join-requests", groupsHandler.ListJoinRequests)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/join-requests/{requestId}/{action}", groupsHandler.HandleJoinRequest)

		// Group posts & comments
		gp := &handlers.GroupPostsHandler{DB: db}
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/posts", gp.CreatePost)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/{id}/posts", gp.ListPosts)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/{id}/posts/{postID}/comments", gp.AddComment)
		r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/{id}/posts/{postID}/comments", gp.ListComments)
	})

	// Notifications
	nHandler := &handlers.NotificationsHandler{DB: db}
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Get("/api/notifications", nHandler.List)
	r.With(func(next http.Handler) http.Handler { return auth.RequireAuth(next, db) }).Post("/api/notifications/read", nHandler.MarkRead)

	return r
}
