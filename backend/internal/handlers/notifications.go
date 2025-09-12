package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"social-network/backend/internal/auth"
)

type NotificationsHandler struct{ DB *sql.DB }

func (h *NotificationsHandler) List(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	rows, err := h.DB.Query("SELECT id, type, actor_user_id, subject_id, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type n struct{ ID, Type, ActorID, SubjectID, CreatedAt, ReadAt string }
	var out []n
	for rows.Next() {
		var x n
		_ = rows.Scan(&x.ID, &x.Type, &x.ActorID, &x.SubjectID, &x.CreatedAt, &x.ReadAt)
		out = append(out, x)
	}
	_ = json.NewEncoder(w).Encode(out)
}

func (h *NotificationsHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := h.DB.Exec("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", id, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
