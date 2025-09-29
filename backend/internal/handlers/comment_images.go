package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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
	if contentType != "image/jpeg" && contentType != "image/jpg" && contentType != "image/png" && contentType != "image/gif" && contentType != "image/webp" {
		http.Error(w, "unsupported file type", http.StatusBadRequest)
		return
	}

	commentID := r.FormValue("comment_id")
	if commentID == "" {
		http.Error(w, "comment_id is required", http.StatusBadRequest)
		return
	}

	// If Cloudinary is configured, try uploading; otherwise fall back to local storage
	var result *services.UploadResult
	if h.CloudinarySvc != nil {
		log.Printf("Attempting to upload image to Cloudinary for comment: %s", commentID)
		if rerr := func() error {
			var upErr error
			result, upErr = h.CloudinarySvc.UploadCommentImage(r.Context(), file, commentID)
			return upErr
		}(); rerr != nil {
			log.Printf("Cloudinary upload error: %v", rerr)
		}
	}

	imageID := uuid.NewString()

	// Local fallback when Cloudinary not set or upload failed
	if result == nil {
		// Reset file reader is not trivial; require frontend to send fresh stream. For simplicity, read from handler again if possible.
		// Try to reopen the file part from the form for local save
		src, _, ferr := r.FormFile("image")
		if ferr != nil {
			log.Printf("failed to reopen image for local save: %v", ferr)
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}
		defer src.Close()

		// Determine extension from content type
		ext := ".jpg"
		switch strings.ToLower(contentType) {
		case "image/png":
			ext = ".png"
		case "image/gif":
			ext = ".gif"
		case "image/webp":
			ext = ".webp"
		case "image/jpeg", "image/jpg":
			ext = ".jpg"
		}

		filename := "comment_" + imageID + ext
		dstPath := filepath.Join("internal", "images", filename)

		// Ensure directory exists
		if err := os.MkdirAll(filepath.Dir(dstPath), 0755); err != nil {
			log.Printf("failed to create images directory: %v", err)
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}

		out, err := os.Create(dstPath)
		if err != nil {
			log.Printf("failed to create image file: %v", err)
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}
		defer out.Close()

		if _, err := io.Copy(out, src); err != nil {
			log.Printf("failed to write image file: %v", err)
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}

		// Insert local image record
		_, err = h.DB.Exec(`
            INSERT INTO comment_images(
                id, comment_id, path, mime, 
                cloudinary_public_id, cloudinary_url, cloudinary_secure_url,
                format
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
			imageID, commentID, filename, contentType,
			"", "", "", strings.TrimPrefix(ext, "."))
		if err != nil {
			log.Printf("DB error (local image): %v", err)
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}

		// Respond with local URL
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":         imageID,
			"public_id":  filename,
			"url":        "/images/" + filename,
			"secure_url": "/images/" + filename,
			"format":     strings.TrimPrefix(ext, "."),
		})
		return
	}

	log.Printf("Cloudinary upload successful: %+v", result)

	// Update database with Cloudinary data
	_, err = h.DB.Exec(`
		INSERT INTO comment_images(
			id, comment_id, path, mime, 
			cloudinary_public_id, cloudinary_url, cloudinary_secure_url,
			format
		) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
		imageID, commentID, result.PublicID, contentType,
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
