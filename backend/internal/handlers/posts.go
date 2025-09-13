package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"social-network/backend/internal/auth"

	"github.com/google/uuid"
)

type PostsHandler struct{ DB *sql.DB }

type createPostRequest struct {
	Text    string   `json:"text"`
	Privacy string   `json:"privacy"` // public|followers|selected
	Allowed []string `json:"allowed_follower_ids"`
}

func (h *PostsHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var body createPostRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if body.Text == "" || (body.Privacy != "public" && body.Privacy != "followers" && body.Privacy != "selected") {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	id := uuid.NewString()
	_, err := h.DB.Exec("INSERT INTO posts(id, user_id, text, privacy, created_at) VALUES(?,?,?,?,?)", id, sess.UserID, body.Text, body.Privacy, time.Now())
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	if body.Privacy == "selected" {
		for _, uid := range body.Allowed {
			_, _ = h.DB.Exec("INSERT OR IGNORE INTO post_allowed_followers(post_id, follower_user_id) VALUES(?,?)", id, uid)
		}
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id})
}

// Simple feed: posts visible to current user by privacy rules
func (h *PostsHandler) Feed(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	// public posts OR posts from users the requester follows (for followers privacy) OR selected where allowed includes requester
	q := `
	SELECT p.id, p.user_id, p.text, p.privacy, p.created_at
	FROM posts p
	LEFT JOIN follows f ON f.followed_user_id = p.user_id AND f.follower_user_id = ?
	LEFT JOIN post_allowed_followers paf ON paf.post_id = p.id AND paf.follower_user_id = ?
	WHERE p.privacy = 'public'
	   OR (p.privacy = 'followers' AND f.follower_user_id IS NOT NULL)
	   OR (p.privacy = 'selected' AND paf.follower_user_id IS NOT NULL)
	ORDER BY p.created_at DESC LIMIT 100`
	rows, err := h.DB.Query(q, sess.UserID, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type post struct {
		ID, UserID, Text, Privacy string
		CreatedAt                 string
	}
	var out []post
	for rows.Next() {
		var p post
		_ = rows.Scan(&p.ID, &p.UserID, &p.Text, &p.Privacy, &p.CreatedAt)
		out = append(out, p)
	}
	_ = json.NewEncoder(w).Encode(out)
}

type createCommentRequest struct {
	Text string `json:"text"`
}

func (h *PostsHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	// visibility check: reuse feed rules for a single post
	visibleQ := `SELECT COUNT(1)
	FROM posts p
	LEFT JOIN follows f ON f.followed_user_id = p.user_id AND f.follower_user_id = ?
	LEFT JOIN post_allowed_followers paf ON paf.post_id = p.id AND paf.follower_user_id = ?
	WHERE p.id = ? AND (p.privacy='public' OR (p.privacy='followers' AND f.follower_user_id IS NOT NULL) OR (p.privacy='selected' AND paf.follower_user_id IS NOT NULL))`
	var cnt int
	_ = h.DB.QueryRow(visibleQ, sess.UserID, sess.UserID, postID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var body createCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Text == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	id := uuid.NewString()
	_, err := h.DB.Exec("INSERT INTO comments(id, post_id, user_id, text, created_at) VALUES(?,?,?,?,?)", id, postID, sess.UserID, body.Text, time.Now())
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	// Notify post owner if commenter is not the owner
	var postOwnerID string
	err = h.DB.QueryRow("SELECT user_id FROM posts WHERE id = ?", postID).Scan(&postOwnerID)
	if err == nil && postOwnerID != sess.UserID {
		notifID := uuid.NewString()
		_, _ = h.DB.Exec("INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id, created_at) VALUES(?,?,?,?,?,?)", notifID, postOwnerID, "comment", sess.UserID, postID, time.Now())
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id})
}

// List comments for a post
func (h *PostsHandler) ListComments(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	// visibility check: reuse feed rules for a single post
	visibleQ := `SELECT COUNT(1)
	FROM posts p
	LEFT JOIN follows f ON f.followed_user_id = p.user_id AND f.follower_user_id = ?
	LEFT JOIN post_allowed_followers paf ON paf.post_id = p.id AND paf.follower_user_id = ?
	WHERE p.id = ? AND (p.privacy='public' OR (p.privacy='followers' AND f.follower_user_id IS NOT NULL) OR (p.privacy='selected' AND paf.follower_user_id IS NOT NULL))`
	var cnt int
	_ = h.DB.QueryRow(visibleQ, sess.UserID, sess.UserID, postID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	rows, err := h.DB.Query("SELECT id, user_id, text, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC", postID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type comment struct {
		ID        string `json:"id"`
		UserID    string `json:"user_id"`
		Text      string `json:"text"`
		CreatedAt string `json:"created_at"`
	}
	var out []comment
	for rows.Next() {
		var c comment
		_ = rows.Scan(&c.ID, &c.UserID, &c.Text, &c.CreatedAt)
		out = append(out, c)
	}
	_ = json.NewEncoder(w).Encode(out)
}
