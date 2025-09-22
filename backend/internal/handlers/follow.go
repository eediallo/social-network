package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type FollowHandler struct {
	DB                  *sql.DB
	NotificationService *services.NotificationService
}

func (h *FollowHandler) SendRequest(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	toUserID := chi.URLParam(r, "toUserID")
	if toUserID == "" || toUserID == sess.UserID {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	// check target profile public
	var isPublic int
	err := h.DB.QueryRow("SELECT public FROM profiles WHERE user_id = ?", toUserID).Scan(&isPublic)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if isPublic == 1 {
		// auto-follow
		_, _ = h.DB.Exec("INSERT OR IGNORE INTO follows(follower_user_id, followed_user_id) VALUES(?,?)", sess.UserID, toUserID)
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "followed"})
		return
	}
	// create request pending
	id := uuid.NewString()
	_, err = h.DB.Exec("INSERT INTO follow_requests(id, from_user_id, to_user_id, status) VALUES(?,?,?, 'pending')", id, sess.UserID, toUserID)
	if err != nil {
		http.Error(w, "conflict", http.StatusConflict)
		return
	}
	// notify target user of follow request
	if h.NotificationService != nil {
		// Get requester name
		var requesterName string
		_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&requesterName)
		if requesterName == "" {
			requesterName = "Someone"
		}

		message := requesterName + " wants to follow you"
		h.NotificationService.CreateFollowNotification(sess.UserID, toUserID, "follow_request", message)
	}
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id, "status": "pending"})
}

func (h *FollowHandler) AcceptRequest(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	reqID := chi.URLParam(r, "id")
	var fromID, toID string
	err := h.DB.QueryRow("SELECT from_user_id, to_user_id FROM follow_requests WHERE id = ? AND status = 'pending'", reqID).Scan(&fromID, &toID)
	if err != nil || toID != sess.UserID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	_, _ = h.DB.Exec("INSERT OR IGNORE INTO follows(follower_user_id, followed_user_id) VALUES(?,?)", fromID, toID)
	_, _ = h.DB.Exec("UPDATE follow_requests SET status = 'accepted' WHERE id = ?", reqID)
	// notify requester of acceptance
	if h.NotificationService != nil {
		// Get accepter name
		var accepterName string
		_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", toID).Scan(&accepterName)
		if accepterName == "" {
			accepterName = "Someone"
		}

		message := accepterName + " accepted your follow request"
		h.NotificationService.CreateFollowNotification(toID, fromID, "follow_accepted", message)
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}

func (h *FollowHandler) DeclineRequest(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	reqID := chi.URLParam(r, "id")
	_, err := h.DB.Exec("UPDATE follow_requests SET status = 'declined' WHERE id = ? AND to_user_id = ? AND status = 'pending'", reqID, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "declined"})
}

func (h *FollowHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	target := chi.URLParam(r, "userID")
	_, _ = h.DB.Exec("DELETE FROM follows WHERE follower_user_id = ? AND followed_user_id = ?", sess.UserID, target)
	w.WriteHeader(http.StatusNoContent)
}

func (h *FollowHandler) ListFollowers(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	rows, err := h.DB.Query(`
		SELECT u.id, u.first_name, u.last_name, p.nickname, p.cloudinary_avatar_secure_url
		FROM follows f 
		JOIN users u ON u.id = f.follower_user_id 
		LEFT JOIN profiles p ON p.user_id = u.id 
		WHERE f.followed_user_id = ?`, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type follower struct {
		ID        string `json:"id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatar_url"`
	}
	var followers []follower
	for rows.Next() {
		var f follower
		var nickname, avatarURL sql.NullString
		_ = rows.Scan(&f.ID, &f.FirstName, &f.LastName, &nickname, &avatarURL)
		f.Nickname = nickname.String
		f.AvatarURL = avatarURL.String
		followers = append(followers, f)
	}
	// Ensure we always return an array, even if empty
	if followers == nil {
		followers = []follower{}
	}
	_ = json.NewEncoder(w).Encode(followers)
}

func (h *FollowHandler) ListFollowing(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	rows, err := h.DB.Query(`
		SELECT u.id, u.first_name, u.last_name, p.nickname, p.cloudinary_avatar_secure_url
		FROM follows f 
		JOIN users u ON u.id = f.followed_user_id 
		LEFT JOIN profiles p ON p.user_id = u.id 
		WHERE f.follower_user_id = ?`, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type followingUser struct {
		ID        string `json:"id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatar_url"`
	}
	var following []followingUser
	for rows.Next() {
		var f followingUser
		var nickname, avatarURL sql.NullString
		_ = rows.Scan(&f.ID, &f.FirstName, &f.LastName, &nickname, &avatarURL)
		f.Nickname = nickname.String
		f.AvatarURL = avatarURL.String
		following = append(following, f)
	}
	// Ensure we always return an array, even if empty
	if following == nil {
		following = []followingUser{}
	}
	_ = json.NewEncoder(w).Encode(following)
}

func (h *FollowHandler) ListRequests(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	rows, err := h.DB.Query(`
		SELECT fr.id, u.id as user_id, u.first_name, u.last_name, u.email, fr.created_at, p.cloudinary_avatar_secure_url
		FROM follow_requests fr
		JOIN users u ON u.id = fr.from_user_id
		LEFT JOIN profiles p ON p.user_id = u.id
		WHERE fr.to_user_id = ? AND fr.status = 'pending'
		ORDER BY fr.created_at DESC`, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type followRequest struct {
		ID        string `json:"id"`
		UserID    string `json:"user_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		CreatedAt string `json:"created_at"`
		AvatarURL string `json:"avatar_url"`
	}
	var requests []followRequest
	for rows.Next() {
		var req followRequest
		var avatarURL sql.NullString
		_ = rows.Scan(&req.ID, &req.UserID, &req.FirstName, &req.LastName, &req.Email, &req.CreatedAt, &avatarURL)
		req.AvatarURL = avatarURL.String
		requests = append(requests, req)
	}
	// Ensure we always return an array, even if empty
	if requests == nil {
		requests = []followRequest{}
	}
	_ = json.NewEncoder(w).Encode(requests)
}
