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
	var nickname, about, avatar sql.NullString
	var first, last, email sql.NullString
	var dob sql.NullString
	if err := h.DB.QueryRow(`SELECT p.public, p.nickname, p.about, p.avatar_path, u.first_name, u.last_name, u.email, u.date_of_birth
		FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?`, userID).Scan(&public, &nickname, &about, &avatar, &first, &last, &email, &dob); err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	// if profile is private and viewer is not owner, ensure viewer follows the user
	isFollowing := 0
	if public == 0 && viewerID != userID {
		_ = h.DB.QueryRow("SELECT COUNT(1) FROM follows WHERE follower_user_id = ? AND followed_user_id = ?", viewerID, userID).Scan(&isFollowing)
		if isFollowing == 0 {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	} else if viewerID != "" {
		// set isFollowing for viewer
		_ = h.DB.QueryRow("SELECT COUNT(1) FROM follows WHERE follower_user_id = ? AND followed_user_id = ?", viewerID, userID).Scan(&isFollowing)
	}

	// follower / following counts
	var followersCount, followingCount int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM follows WHERE followed_user_id = ?", userID).Scan(&followersCount)
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM follows WHERE follower_user_id = ?", userID).Scan(&followingCount)

	out := map[string]any{
		"user_id":         userID,
		"public":          public == 1,
		"nickname":        nickname.String,
		"about":           about.String,
		"avatar_path":     avatar.String,
		"first_name":      first.String,
		"last_name":       last.String,
		"followers_count": followersCount,
		"following_count": followingCount,
		"is_following":    isFollowing == 1,
	}
	// only include sensitive fields for the profile owner
	if viewerID == userID {
		out["email"] = email.String
		out["date_of_birth"] = dob.String
	}

	_ = json.NewEncoder(w).Encode(out)
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

type profileUpdate struct {
	Nickname string `json:"nickname"`
	About    string `json:"about"`
}

func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var body profileUpdate
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := h.DB.Exec("UPDATE profiles SET nickname = ?, about = ? WHERE user_id = ?", body.Nickname, body.About, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
