package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"social-network/backend/internal/auth"

	"github.com/go-chi/chi/v5"
)

type ProfileHandler struct {
	DB *sql.DB
}

type privacyUpdate struct {
	Public bool `json:"public"`
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	viewerID := ""
	if s, ok := auth.SessionFromContext(r); ok {
		viewerID = s.UserID
	}
	userID := chi.URLParam(r, "id")
	var public int
	var nickname, about sql.NullString
	if err := h.DB.QueryRow("SELECT public, nickname, about FROM profiles WHERE user_id = ?", userID).Scan(&public, &nickname, &about); err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if public == 0 && viewerID != userID {
		// check follow relation
		var cnt int
		_ = h.DB.QueryRow("SELECT COUNT(1) FROM follows WHERE follower_user_id = ? AND followed_user_id = ?", viewerID, userID).Scan(&cnt)
		if cnt == 0 {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	}
	_ = json.NewEncoder(w).Encode(map[string]any{
		"user_id":  userID,
		"public":   public == 1,
		"nickname": nickname.String,
		"about":    about.String,
	})
}

func (h *ProfileHandler) TogglePrivacy(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var body privacyUpdate
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	val := 0
	if body.Public {
		val = 1
	}
	_, err := h.DB.Exec("UPDATE profiles SET public = ? WHERE user_id = ?", val, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"public": body.Public})
}
