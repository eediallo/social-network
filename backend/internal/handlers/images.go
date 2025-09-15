package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/services"

	"github.com/google/uuid"
)

type ImagesHandler struct {
	DB            *sql.DB
	CloudinarySvc *services.CloudinaryService
}

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
}

func (h *ImagesHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	r.ParseMultipartForm(10 << 20) // 10MB max
	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	if !allowedImageTypes[handler.Header.Get("Content-Type")] {
		http.Error(w, "unsupported file type", http.StatusBadRequest)
		return
	}

	// Upload to Cloudinary
	result, err := h.CloudinarySvc.UploadAvatar(r.Context(), file, sess.UserID)
	if err != nil {
		log.Printf("Cloudinary upload error: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Update database with Cloudinary data
	_, err = h.DB.Exec(`
		UPDATE profiles 
		SET cloudinary_avatar_public_id = ?, 
		    cloudinary_avatar_url = ?, 
		    cloudinary_avatar_secure_url = ?,
		    avatar_path = ?
		WHERE user_id = ?`,
		result.PublicID, result.URL, result.SecureURL, result.PublicID, sess.UserID)

	if err != nil {
		log.Printf("DB error: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Return Cloudinary data
	response := map[string]interface{}{
		"public_id":  result.PublicID,
		"url":        result.URL,
		"secure_url": result.SecureURL,
		"width":      result.Width,
		"height":     result.Height,
		"format":     result.Format,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *ImagesHandler) UploadPostImage(w http.ResponseWriter, r *http.Request) {
	_, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	r.ParseMultipartForm(10 << 20) // 10MB max
	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	if !allowedImageTypes[handler.Header.Get("Content-Type")] {
		http.Error(w, "unsupported file type", http.StatusBadRequest)
		return
	}

	postID := r.FormValue("post_id")
	if postID == "" {
		http.Error(w, "post_id is required", http.StatusBadRequest)
		return
	}

	// Check if Cloudinary service is available
	if h.CloudinarySvc == nil {
		log.Printf("Cloudinary service is nil - falling back to local storage")
		http.Error(w, "Cloudinary not configured", http.StatusInternalServerError)
		return
	}

	// Upload to Cloudinary
	log.Printf("Attempting to upload image to Cloudinary for post: %s", postID)
	result, err := h.CloudinarySvc.UploadPostImage(r.Context(), file, postID)
	if err != nil {
		log.Printf("Cloudinary upload error: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	log.Printf("Cloudinary upload successful: %+v", result)

	// Update database with Cloudinary data
	imageID := uuid.NewString()
	_, err = h.DB.Exec(`
		INSERT INTO post_images(
			id, post_id, path, mime, 
			cloudinary_public_id, cloudinary_url, cloudinary_secure_url,
			width, height, format
		) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		imageID, postID, result.PublicID, result.Format,
		result.PublicID, result.URL, result.SecureURL,
		result.Width, result.Height, result.Format)

	if err != nil {
		log.Printf("DB error: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Return Cloudinary data
	response := map[string]interface{}{
		"id":         imageID,
		"public_id":  result.PublicID,
		"url":        result.URL,
		"secure_url": result.SecureURL,
		"width":      result.Width,
		"height":     result.Height,
		"format":     result.Format,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
