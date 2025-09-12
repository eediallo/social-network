package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	"social-network/backend/internal/auth"
)

type AuthHandler struct {
	DB *sql.DB
}

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DateOfBirth string `json:"date_of_birth"`
	Nickname    string `json:"nickname"`
	About       string `json:"about"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type userResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" || req.DateOfBirth == "" {
		http.Error(w, "missing fields", http.StatusBadRequest)
		return
	}
	pwd, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	id := uuid.NewString()
	_, err = h.DB.Exec(`INSERT INTO users(id, email, password_hash, first_name, last_name, date_of_birth) VALUES(?,?,?,?,?,?)`,
		id, req.Email, pwd, req.FirstName, req.LastName, req.DateOfBirth,
	)
	if err != nil {
		http.Error(w, "could not create user", http.StatusBadRequest)
		return
	}
	// create profile
	_, _ = h.DB.Exec(`INSERT INTO profiles(user_id, public, nickname, about) VALUES(?,?,?,?)`, id, 1, req.Nickname, req.About)

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(userResponse{ID: id, Email: req.Email, FirstName: req.FirstName, LastName: req.LastName})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	var id, hash, first, last string
	err := h.DB.QueryRow("SELECT id, password_hash, first_name, last_name FROM users WHERE email = ?", req.Email).Scan(&id, &hash, &first, &last)
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	if err := auth.CheckPassword(hash, req.Password); err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	sess, err := auth.CreateSession(h.DB, id, 7*24*time.Hour, r.UserAgent(), r.RemoteAddr)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	auth.SetSessionCookie(w, sess)
	_ = json.NewEncoder(w).Encode(userResponse{ID: id, Email: req.Email, FirstName: first, LastName: last})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(auth.SessionCookieName)
	if err == nil && cookie.Value != "" {
		_ = auth.DeleteSession(h.DB, cookie.Value)
	}
	auth.ClearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var email, first, last string
	if err := h.DB.QueryRow("SELECT email, first_name, last_name FROM users WHERE id = ?", sess.UserID).Scan(&email, &first, &last); err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	_ = json.NewEncoder(w).Encode(userResponse{ID: sess.UserID, Email: email, FirstName: first, LastName: last})
}
