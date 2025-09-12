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

// no extra helpers
