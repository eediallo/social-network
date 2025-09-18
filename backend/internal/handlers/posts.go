package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/services"

	"github.com/google/uuid"
)

type PostsHandler struct {
	DB                  *sql.DB
	NotificationService *services.NotificationService
}

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
	SELECT p.id, p.user_id, p.text, p.privacy, p.created_at, u.first_name, u.last_name,
	       p_avatar.cloudinary_avatar_secure_url as user_avatar_url,
	       pi.id as image_id, 
	       COALESCE(pi.cloudinary_secure_url, pi.cloudinary_url, '/images/' || pi.path) as image_url,
	       pi.format as image_format
	FROM posts p
	JOIN users u ON u.id = p.user_id
	LEFT JOIN profiles p_avatar ON p_avatar.user_id = p.user_id
	LEFT JOIN follows f ON f.followed_user_id = p.user_id AND f.follower_user_id = ?
	LEFT JOIN post_allowed_followers paf ON paf.post_id = p.id AND paf.follower_user_id = ?
	LEFT JOIN post_images pi ON pi.post_id = p.id
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
	type image struct {
		ID     string `json:"id"`
		URL    string `json:"url"`
		Format string `json:"format"`
	}
	type post struct {
		ID        string  `json:"id"`
		UserID    string  `json:"user_id"`
		Text      string  `json:"text"`
		Privacy   string  `json:"privacy"`
		CreatedAt string  `json:"created_at"`
		FirstName string  `json:"first_name"`
		LastName  string  `json:"last_name"`
		AvatarURL string  `json:"avatar_url"`
		Images    []image `json:"images"`
	}

	// Group posts and their images while preserving order
	postMap := make(map[string]*post)
	var postOrder []string // Track order of posts

	for rows.Next() {
		var p post
		var imageID, imageURL, imageFormat, userAvatarURL sql.NullString
		_ = rows.Scan(&p.ID, &p.UserID, &p.Text, &p.Privacy, &p.CreatedAt, &p.FirstName, &p.LastName, &userAvatarURL, &imageID, &imageURL, &imageFormat)
		p.AvatarURL = userAvatarURL.String

		if existingPost, exists := postMap[p.ID]; exists {
			// Add image to existing post
			if imageID.Valid {
				existingPost.Images = append(existingPost.Images, image{
					ID:     imageID.String,
					URL:    imageURL.String,
					Format: imageFormat.String,
				})
			}
		} else {
			// Create new post
			p.Images = []image{}
			if imageID.Valid {
				p.Images = append(p.Images, image{
					ID:     imageID.String,
					URL:    imageURL.String,
					Format: imageFormat.String,
				})
			}
			postMap[p.ID] = &p
			postOrder = append(postOrder, p.ID) // Track order
		}
	}

	// Convert map to slice in the correct order
	var out []post
	for _, postID := range postOrder {
		if p, exists := postMap[postID]; exists {
			out = append(out, *p)
		}
	}
	_ = json.NewEncoder(w).Encode(out)
}

// Get images for a post
func (h *PostsHandler) GetPostImages(w http.ResponseWriter, r *http.Request) {
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

	// Check if user can see this post (reuse visibility logic)
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

	rows, err := h.DB.Query("SELECT id, path, mime FROM post_images WHERE post_id = ? ORDER BY created_at ASC", postID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type image struct {
		ID   string `json:"id"`
		Path string `json:"path"`
		Mime string `json:"mime"`
	}
	var out []image
	for rows.Next() {
		var img image
		_ = rows.Scan(&img.ID, &img.Path, &img.Mime)
		out = append(out, img)
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

	// Get the complete comment data with user information
	var comment struct {
		ID        string `json:"id"`
		UserID    string `json:"user_id"`
		Text      string `json:"text"`
		CreatedAt string `json:"created_at"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		AvatarURL string `json:"avatar_url"`
	}

	err = h.DB.QueryRow(`
		SELECT c.id, c.user_id, c.text, c.created_at, u.first_name, u.last_name, p.cloudinary_avatar_secure_url
		FROM comments c
		JOIN users u ON u.id = c.user_id
		LEFT JOIN profiles p ON p.user_id = c.user_id
		WHERE c.id = ?
	`, id).Scan(&comment.ID, &comment.UserID, &comment.Text, &comment.CreatedAt, &comment.FirstName, &comment.LastName, &comment.AvatarURL)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Notify post owner if commenter is not the owner
	var postOwnerID string
	err = h.DB.QueryRow("SELECT user_id FROM posts WHERE id = ?", postID).Scan(&postOwnerID)
	if err == nil && postOwnerID != sess.UserID && h.NotificationService != nil {
		// Get commenter name
		var commenterName string
		_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&commenterName)
		if commenterName == "" {
			commenterName = "Someone"
		}

		message := commenterName + " commented on your post"
		h.NotificationService.CreatePostNotification(sess.UserID, postID, postOwnerID, "comment", message)
	}

	_ = json.NewEncoder(w).Encode(comment)
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
	rows, err := h.DB.Query(`
		SELECT c.id, c.user_id, c.text, c.created_at, u.first_name, u.last_name, p.cloudinary_avatar_secure_url,
		       ci.id as image_id, ci.cloudinary_secure_url as image_url, ci.format as image_format
		FROM comments c
		JOIN users u ON u.id = c.user_id
		LEFT JOIN profiles p ON p.user_id = c.user_id
		LEFT JOIN comment_images ci ON ci.comment_id = c.id
		WHERE c.post_id = ? 
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type commentImage struct {
		ID     string `json:"id"`
		URL    string `json:"url"`
		Format string `json:"format"`
	}
	type comment struct {
		ID        string         `json:"id"`
		UserID    string         `json:"user_id"`
		Text      string         `json:"text"`
		CreatedAt string         `json:"created_at"`
		FirstName string         `json:"first_name"`
		LastName  string         `json:"last_name"`
		AvatarURL string         `json:"avatar_url"`
		Images    []commentImage `json:"images"`
	}

	// Group comments and their images while preserving order
	commentMap := make(map[string]*comment)
	var commentOrder []string // Track order of comments

	for rows.Next() {
		var c comment
		var firstName, lastName string
		var avatarURL, imageID, imageURL, imageFormat sql.NullString
		_ = rows.Scan(&c.ID, &c.UserID, &c.Text, &c.CreatedAt, &firstName, &lastName, &avatarURL, &imageID, &imageURL, &imageFormat)
		c.FirstName = firstName
		c.LastName = lastName
		c.AvatarURL = avatarURL.String

		// Check if this comment already exists
		if existingComment, exists := commentMap[c.ID]; exists {
			// Add image to existing comment if it exists
			if imageID.Valid && imageURL.Valid {
				existingComment.Images = append(existingComment.Images, commentImage{
					ID:     imageID.String,
					URL:    imageURL.String,
					Format: imageFormat.String,
				})
			}
		} else {
			// Create new comment
			c.Images = []commentImage{}
			if imageID.Valid && imageURL.Valid {
				c.Images = append(c.Images, commentImage{
					ID:     imageID.String,
					URL:    imageURL.String,
					Format: imageFormat.String,
				})
			}
			commentMap[c.ID] = &c
			commentOrder = append(commentOrder, c.ID)
		}
	}

	// Convert map back to slice in correct order
	var out []comment
	for _, commentID := range commentOrder {
		out = append(out, *commentMap[commentID])
	}
	_ = json.NewEncoder(w).Encode(out)
}

// Get posts by a specific user
func (h *PostsHandler) GetUserPosts(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Check if the requesting user can see posts from the target user
	// If it's their own posts, show all. If it's someone else's, check privacy rules
	var canView bool
	if userID == sess.UserID {
		canView = true
	} else {
		// Check if the target user is public or if the requester follows them
		var isPublic int
		var isFollowing int
		_ = h.DB.QueryRow("SELECT public FROM profiles WHERE user_id = ?", userID).Scan(&isPublic)
		_ = h.DB.QueryRow("SELECT COUNT(1) FROM follows WHERE follower_user_id = ? AND followed_user_id = ?", sess.UserID, userID).Scan(&isFollowing)
		canView = isPublic == 1 || isFollowing > 0
	}

	if !canView {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Get posts by the user, respecting privacy rules
	q := `
	SELECT p.id, p.user_id, p.text, p.privacy, p.created_at
	FROM posts p
	WHERE p.user_id = ?
	AND (p.privacy = 'public' 
		OR (p.privacy = 'followers' AND ? = 1)
		OR p.user_id = ?)
	ORDER BY p.created_at DESC LIMIT 100`

	rows, err := h.DB.Query(q, userID, canView, sess.UserID)
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

// LikePost likes a post
func (h *PostsHandler) LikePost(w http.ResponseWriter, r *http.Request) {
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

	// Check if user can see this post (reuse visibility logic)
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

	// Check if user already liked this post
	var existingLike int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM post_likes WHERE post_id = ? AND user_id = ?", postID, sess.UserID).Scan(&existingLike)

	if existingLike > 0 {
		// Unlike: delete the like
		_, err := h.DB.Exec("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", postID, sess.UserID)
		if err != nil {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}
	} else {
		// Like: insert the like
		_, err := h.DB.Exec("INSERT INTO post_likes(post_id, user_id, created_at) VALUES(?,?,?)", postID, sess.UserID, time.Now())
		if err != nil {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}
	}

	// Get updated like count
	var likeCount int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM post_likes WHERE post_id = ?", postID).Scan(&likeCount)

	// Check if current user liked this post
	var isLiked int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM post_likes WHERE post_id = ? AND user_id = ?", postID, sess.UserID).Scan(&isLiked)

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"likes":    likeCount,
		"is_liked": isLiked > 0,
	})
}

// GetPostLikes gets the like count and status for a post
func (h *PostsHandler) GetPostLikes(w http.ResponseWriter, r *http.Request) {
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

	// Check if user can see this post (reuse visibility logic)
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

	// Get like count
	var likeCount int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM post_likes WHERE post_id = ?", postID).Scan(&likeCount)

	// Check if current user liked this post
	var isLiked int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM post_likes WHERE post_id = ? AND user_id = ?", postID, sess.UserID).Scan(&isLiked)

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"likes":    likeCount,
		"is_liked": isLiked > 0,
	})
}
