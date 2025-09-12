package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"social-network/backend/internal/auth"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type FollowHandler struct {
	DB *sql.DB
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
	_, _ = h.DB.Exec("INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id) VALUES(?,?,?,?,?)", uuid.NewString(), toUserID, "follow_request", sess.UserID, id)
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
	_, _ = h.DB.Exec("INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id) VALUES(?,?,?,?,?)", uuid.NewString(), fromID, "follow_accepted", toID, reqID)
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
	rows, err := h.DB.Query("SELECT follower_user_id FROM follows WHERE followed_user_id = ?", sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		ids = append(ids, id)
	}
	_ = json.NewEncoder(w).Encode(ids)
}

func (h *FollowHandler) ListFollowing(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	rows, err := h.DB.Query("SELECT followed_user_id FROM follows WHERE follower_user_id = ?", sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		ids = append(ids, id)
	}
	_ = json.NewEncoder(w).Encode(ids)
}
