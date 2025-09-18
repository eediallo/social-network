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

type CommentImagesHandler struct {
	DB            *sql.DB
	CloudinarySvc *services.CloudinaryService
}

func (h *CommentImagesHandler) UploadCommentImage(w http.ResponseWriter, r *http.Request) {
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

	// Check if file type is allowed
	contentType := handler.Header.Get("Content-Type")
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/gif" {
		http.Error(w, "unsupported file type", http.StatusBadRequest)
		return
	}

	commentID := r.FormValue("comment_id")
	if commentID == "" {
		http.Error(w, "comment_id is required", http.StatusBadRequest)
		return
	}

	// Check if Cloudinary service is available
	if h.CloudinarySvc == nil {
		log.Printf("Cloudinary service is nil - falling back to local storage")
		http.Error(w, "Cloudinary not configured", http.StatusInternalServerError)
		return
	}

	// Upload to Cloudinary
	log.Printf("Attempting to upload image to Cloudinary for comment: %s", commentID)
	result, err := h.CloudinarySvc.UploadCommentImage(r.Context(), file, commentID)
	if err != nil {
		log.Printf("Cloudinary upload error: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	log.Printf("Cloudinary upload successful: %+v", result)

	// Update database with Cloudinary data
	imageID := uuid.NewString()
	_, err = h.DB.Exec(`
		INSERT INTO comment_images(
			id, comment_id, path, mime, 
			cloudinary_public_id, cloudinary_url, cloudinary_secure_url,
			format
		) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
		imageID, commentID, result.PublicID, result.Format,
		result.PublicID, result.URL, result.SecureURL, result.Format)

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
		"format":     result.Format,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}