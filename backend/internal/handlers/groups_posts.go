package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GroupPostsHandler struct {
	DB            *sql.DB
	CloudinarySvc *services.CloudinaryService
}

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

	// Enhanced query with user info and images
	rows, err := h.DB.Query(`
		SELECT gp.id, gp.user_id, gp.text, gp.created_at,
		       u.first_name, u.last_name, p.cloudinary_avatar_secure_url,
		       gpi.id as image_id, 
		       COALESCE(gpi.cloudinary_secure_url, gpi.cloudinary_url, gpi.path) as image_url,
		       gpi.format as image_format
		FROM group_posts gp
		JOIN users u ON u.id = gp.user_id
		LEFT JOIN profiles p ON p.user_id = gp.user_id
		LEFT JOIN group_post_images gpi ON gpi.group_post_id = gp.id
		WHERE gp.group_id = ?
		ORDER BY gp.created_at DESC
	`, gid)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type groupPostImage struct {
		ID     string `json:"id"`
		URL    string `json:"url"`
		Format string `json:"format"`
	}

	type groupPost struct {
		ID        string           `json:"id"`
		UserID    string           `json:"user_id"`
		Text      string           `json:"text"`
		CreatedAt string           `json:"created_at"`
		FirstName string           `json:"first_name"`
		LastName  string           `json:"last_name"`
		AvatarURL string           `json:"avatar_url"`
		Images    []groupPostImage `json:"images"`
	}

	// Group posts and their images
	postMap := make(map[string]*groupPost)
	var postOrder []string

	for rows.Next() {
		var gp groupPost
		var userAvatarURL, imageID, imageURL, imageFormat sql.NullString

		_ = rows.Scan(&gp.ID, &gp.UserID, &gp.Text, &gp.CreatedAt,
			&gp.FirstName, &gp.LastName, &userAvatarURL,
			&imageID, &imageURL, &imageFormat)

		gp.AvatarURL = userAvatarURL.String

		if existingPost, exists := postMap[gp.ID]; exists {
			// Add image to existing post
			if imageID.Valid {
				existingPost.Images = append(existingPost.Images, groupPostImage{
					ID:     imageID.String,
					URL:    imageURL.String,
					Format: imageFormat.String,
				})
			}
		} else {
			// Create new post
			gp.Images = []groupPostImage{}
			if imageID.Valid {
				gp.Images = append(gp.Images, groupPostImage{
					ID:     imageID.String,
					URL:    imageURL.String,
					Format: imageFormat.String,
				})
			}
			postMap[gp.ID] = &gp
			postOrder = append(postOrder, gp.ID)
		}
	}

	// Convert map to slice and fix image URLs
	var out []groupPost
	for _, postID := range postOrder {
		if p, exists := postMap[postID]; exists {
			// Fix image URLs - convert Cloudinary public IDs to full URLs
			for i, img := range p.Images {
				if img.URL != "" && !strings.HasPrefix(img.URL, "http") {
					// This is a Cloudinary public ID, convert to full URL
					if h.CloudinarySvc != nil {
						p.Images[i].URL = h.CloudinarySvc.GetImageURL(img.URL)
					} else {
						// Fallback to hardcoded URL if CloudinaryService is not available
						p.Images[i].URL = "https://res.cloudinary.com/dzz51m6zs/image/upload/" + img.URL
					}
				}
			}
			out = append(out, *p)
		}
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

	// Enhanced query with user info
	rows, err := h.DB.Query(`
		SELECT gc.id, gc.user_id, gc.text, gc.created_at,
		       u.first_name, u.last_name, p.cloudinary_avatar_secure_url
		FROM group_comments gc
		JOIN users u ON u.id = gc.user_id
		LEFT JOIN profiles p ON p.user_id = gc.user_id
		WHERE gc.group_post_id = ?
		ORDER BY gc.created_at ASC
	`, postID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type groupComment struct {
		ID        string `json:"id"`
		UserID    string `json:"user_id"`
		Text      string `json:"text"`
		CreatedAt string `json:"created_at"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		AvatarURL string `json:"avatar_url"`
	}

	var out []groupComment
	for rows.Next() {
		var c groupComment
		var userAvatarURL sql.NullString

		_ = rows.Scan(&c.ID, &c.UserID, &c.Text, &c.CreatedAt,
			&c.FirstName, &c.LastName, &userAvatarURL)

		c.AvatarURL = userAvatarURL.String
		out = append(out, c)
	}

	_ = json.NewEncoder(w).Encode(out)
}
