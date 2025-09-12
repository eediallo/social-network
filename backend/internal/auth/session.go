package auth

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
)

const SessionCookieName = "sid"

type Session struct {
	ID        string
	UserID    string
	ExpiresAt time.Time
}

func CreateSession(db *sql.DB, userID string, ttl time.Duration, ua, ip string) (*Session, error) {
	id := uuid.NewString()
	expires := time.Now().Add(ttl)
	_, err := db.Exec(
		"INSERT INTO sessions(id, user_id, expires_at, user_agent, ip) VALUES(?,?,?,?,?)",
		id, userID, expires, ua, ip,
	)
	if err != nil {
		return nil, err
	}
	return &Session{ID: id, UserID: userID, ExpiresAt: expires}, nil
}

func DeleteSession(db *sql.DB, id string) error {
	_, err := db.Exec("DELETE FROM sessions WHERE id = ?", id)
	return err
}

func GetSession(db *sql.DB, id string) (*Session, error) {
	var s Session
	var expires string
	err := db.QueryRow("SELECT id, user_id, expires_at FROM sessions WHERE id = ?", id).Scan(&s.ID, &s.UserID, &expires)
	if err != nil {
		return nil, err
	}
	// SQLite returns TIMESTAMP as string; parse RFC3339 or fallback to time parsing
	if t, e := time.Parse(time.RFC3339, expires); e == nil {
		s.ExpiresAt = t
	} else {
		// try SQLite default format
		if t2, e2 := time.Parse("2006-01-02 15:04:05", expires); e2 == nil {
			s.ExpiresAt = t2
		}
	}
	return &s, nil
}

// Context helpers

type ctxKey string

const sessionKey ctxKey = "session"

func WithSession(r *http.Request, s *Session) *http.Request {
	ctx := context.WithValue(r.Context(), sessionKey, s)
	return r.WithContext(ctx)
}

func SessionFromContext(r *http.Request) (*Session, bool) {
	v := r.Context().Value(sessionKey)
	if v == nil {
		return nil, false
	}
	s, ok := v.(*Session)
	return s, ok
}

func RequireAuth(next http.Handler, dbConn *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(SessionCookieName)
		if err != nil || cookie.Value == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		sess, err := GetSession(dbConn, cookie.Value)
		if err != nil || sess.ExpiresAt.Before(time.Now()) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, WithSession(r, sess))
	})
}

func SetSessionCookie(w http.ResponseWriter, s *Session) {
	cookie := &http.Cookie{
		Name:     SessionCookieName,
		Value:    s.ID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  s.ExpiresAt,
	}
	http.SetCookie(w, cookie)
}

func ClearSessionCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
	}
	http.SetCookie(w, cookie)
}

var ErrUnauthorized = errors.New("unauthorized")
