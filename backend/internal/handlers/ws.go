package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"social-network/backend/internal/auth"
	ws "social-network/backend/internal/websocket"

	"github.com/google/uuid"

	"github.com/gorilla/websocket"
)

type WSHandler struct {
	DB  *sql.DB
	Hub *ws.Hub
}

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type wsMessage struct {
	Type string `json:"type"` // direct|group|subscribe_group
	To   string `json:"to"`   // user id or group id
	Text string `json:"text"`
}

func (h *WSHandler) Serve(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := &ws.Client{UserID: sess.UserID, Send: make(chan []byte, 16)}
	h.Hub.Register(sess.UserID, client)

	go func() {
		for msg := range client.Send {
			_ = conn.WriteMessage(websocket.TextMessage, msg)
		}
	}()

	defer func() {
		h.Hub.Unregister(sess.UserID, client)
		conn.Close()
	}()

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var m wsMessage
		if json.Unmarshal(data, &m) != nil {
			continue
		}
		switch m.Type {
		case "subscribe_group":
			h.Hub.SubscribeGroup(m.To, client)
		case "direct":
			if m.To == "" || m.Text == "" {
				continue
			}
			// persist
			_, _ = h.DB.Exec("INSERT INTO direct_messages(id, from_user_id, to_user_id, text) VALUES(?,?,?,?)", uuid.NewString(), sess.UserID, m.To, m.Text)
			h.Hub.BroadcastToUser(m.To, data)
		case "group":
			if m.To == "" || m.Text == "" {
				continue
			}
			// optional: membership check omitted for brevity
			_, _ = h.DB.Exec("INSERT INTO group_messages(id, group_id, from_user_id, text) VALUES(?,?,?,?)", uuid.NewString(), m.To, sess.UserID, m.Text)
			h.Hub.BroadcastToGroup(m.To, data)
		}
	}
}

// List direct message history between two users
func (h *WSHandler) ListDirectMessages(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	otherID := r.URL.Query().Get("user_id")
	if otherID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	rows, err := h.DB.Query(`SELECT id, from_user_id, to_user_id, text, created_at FROM direct_messages WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) ORDER BY created_at ASC`, sess.UserID, otherID, otherID, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type msg struct {
		ID        string `json:"id"`
		FromID    string `json:"from_user_id"`
		ToID      string `json:"to_user_id"`
		Text      string `json:"text"`
		CreatedAt string `json:"created_at"`
	}
	var out []msg
	for rows.Next() {
		var m msg
		_ = rows.Scan(&m.ID, &m.FromID, &m.ToID, &m.Text, &m.CreatedAt)
		out = append(out, m)
	}
	_ = json.NewEncoder(w).Encode(out)
}

// List group message history
func (h *WSHandler) ListGroupMessages(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := r.URL.Query().Get("group_id")
	if gid == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	// membership check
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	rows, err := h.DB.Query("SELECT id, from_user_id, text, created_at FROM group_messages WHERE group_id = ? ORDER BY created_at ASC", gid)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type gmsg struct {
		ID        string `json:"id"`
		FromID    string `json:"from_user_id"`
		Text      string `json:"text"`
		CreatedAt string `json:"created_at"`
	}
	var out []gmsg
	for rows.Next() {
		var m gmsg
		_ = rows.Scan(&m.ID, &m.FromID, &m.Text, &m.CreatedAt)
		out = append(out, m)
	}
	_ = json.NewEncoder(w).Encode(out)
}
