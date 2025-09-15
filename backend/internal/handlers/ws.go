package handlers

import (
	"database/sql"
	"net/http"

	"social-network/backend/internal/auth"
	ws "social-network/backend/internal/websocket"
)

type WSHandler struct {
	DB  *sql.DB
	Hub *ws.Hub
}

func (h *WSHandler) Serve(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get group ID from query parameter if present
	groupID := r.URL.Query().Get("group")

	// Use the new ServeWS function from the websocket package
	ws.ServeWS(h.Hub, w, r, sess.UserID, groupID)
}
