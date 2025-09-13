package handlers

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"social-network/backend/internal/auth"
)

type ImagesHandler struct {
	DB         *sql.DB
	StorageDir string
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
	filename := fmt.Sprintf("avatar_%s%s", sess.UserID, extFromContentType(handler.Header.Get("Content-Type")))
	path := filepath.Join(h.StorageDir, filename)
	log.Println(h.StorageDir, "<====h.StorageDir======")
	log.Println(path, "<====path======")
	out, err := os.Create(path)
	log.Println(out, "<====OUT======")
	if err != nil {
		log.Printf("File create error: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer out.Close()
	_, err = io.Copy(out, file)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	// Optionally update DB with avatar path
	_, err = h.DB.Exec("UPDATE profiles SET avatar_path = ? WHERE user_id = ?", filename, sess.UserID)
	if err != nil {
		log.Printf("DB error: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(filename))
}

func (h *ImagesHandler) UploadPostImage(w http.ResponseWriter, r *http.Request) {
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
	postID := r.FormValue("post_id")
	filename := fmt.Sprintf("post_%s_%s%s", postID, sess.UserID, extFromContentType(handler.Header.Get("Content-Type")))
	path := filepath.Join(h.StorageDir, filename)
	out, err := os.Create(path)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer out.Close()
	_, err = io.Copy(out, file)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	// Optionally update DB with image path
	_, _ = h.DB.Exec("INSERT INTO post_images(post_id, filename) VALUES(?, ?)", postID, filename)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(filename))
}

func extFromContentType(ct string) string {
	switch ct {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	default:
		return ""
	}
}
