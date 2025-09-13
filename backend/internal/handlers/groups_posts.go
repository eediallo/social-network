package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"social-network/backend/internal/auth"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GroupPostsHandler struct{ DB *sql.DB }

type createGroupPostReq struct {
	Text string `json:"text"`
}

func (h *GroupPostsHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	// membership check
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var body createGroupPostReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Text == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	id := uuid.NewString()
	_, err := h.DB.Exec("INSERT INTO group_posts(id, group_id, user_id, text) VALUES(?,?,?,?)", id, gid, sess.UserID, body.Text)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func (h *GroupPostsHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	rows, err := h.DB.Query("SELECT id, user_id, text, created_at FROM group_posts WHERE group_id = ? ORDER BY created_at DESC", gid)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type gp struct{ ID, UserID, Text, CreatedAt string }
	var out []gp
	for rows.Next() {
		var x gp
		_ = rows.Scan(&x.ID, &x.UserID, &x.Text, &x.CreatedAt)
		out = append(out, x)
	}
	_ = json.NewEncoder(w).Encode(out)
}

type createGroupCommentReq struct {
	Text string `json:"text"`
}

func (h *GroupPostsHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	postID := chi.URLParam(r, "postID")
	// membership check
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var body createGroupCommentReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Text == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	id := uuid.NewString()
	_, err := h.DB.Exec("INSERT INTO group_comments(id, group_post_id, user_id, text) VALUES(?,?,?,?)", id, postID, sess.UserID, body.Text)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id})
}

// List comments for a group post
func (h *GroupPostsHandler) ListComments(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	postID := chi.URLParam(r, "postID")
	// membership check
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	rows, err := h.DB.Query("SELECT id, user_id, text, created_at FROM group_comments WHERE group_post_id = ? ORDER BY created_at ASC", postID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type gc struct {
		ID        string `json:"id"`
		UserID    string `json:"user_id"`
		Text      string `json:"text"`
		CreatedAt string `json:"created_at"`
	}
	var out []gc
	for rows.Next() {
		var c gc
		_ = rows.Scan(&c.ID, &c.UserID, &c.Text, &c.CreatedAt)
		out = append(out, c)
	}
	_ = json.NewEncoder(w).Encode(out)
}
