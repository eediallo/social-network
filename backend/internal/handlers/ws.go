package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"social-network/backend/internal/auth"
	ws "social-network/backend/internal/websocket"
)

type WSHandler struct {
	DB  *sql.DB
	Hub *ws.Hub
}

func (h *WSHandler) Serve(w http.ResponseWriter, r *http.Request) {
	// Try to get session from context first (cookie-based auth)
	sess, ok := auth.SessionFromContext(r)

	// If not found in context, try to get from query parameter or cookie
	if !ok {
		sessionID := r.URL.Query().Get("sid")

		// If not in query param, try to get from cookie
		if sessionID == "" {
			cookies := r.Cookies()
			for _, cookie := range cookies {
				if cookie.Name == "sid" {
					sessionID = cookie.Value
					break
				}
			}
		}

		if sessionID != "" {
			// Validate session ID from database
			var userID string
			err := h.DB.QueryRow("SELECT user_id FROM sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP", sessionID).Scan(&userID)
			if err != nil {
				log.Printf("WebSocket auth failed for session %s: %v", sessionID, err)
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			sess = &auth.Session{UserID: userID}
			ok = true
			log.Printf("WebSocket authenticated user %s via session %s", userID, sessionID)
		}
	}

	if !ok {
		log.Printf("WebSocket authentication failed - no valid session found")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get group ID from query parameter if present
	groupID := r.URL.Query().Get("group")

	// Use the new ServeWS function from the websocket package
	ws.ServeWS(h.Hub, w, r, sess.UserID, groupID)
}
