package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/websocket"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ChatHandler struct {
	DB  *sql.DB
	Hub *websocket.Hub
}

type sendMessageReq struct {
	Content     string `json:"content"`
	RecipientID string `json:"recipient_id,omitempty"`
	GroupID     string `json:"group_id,omitempty"`
}

// SendDirectMessage sends a direct message to another user
func (h *ChatHandler) SendDirectMessage(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var body sendMessageReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Content == "" || body.RecipientID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Check if recipient exists
	var recipientExists bool
	err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)", body.RecipientID).Scan(&recipientExists)
	if err != nil || !recipientExists {
		http.Error(w, "recipient not found", http.StatusNotFound)
		return
	}

	messageID := uuid.NewString()
	createdAt := time.Now().Format("2006-01-02T15:04:05Z")

	// Save message to database
	_, err = h.DB.Exec(`
		INSERT INTO direct_messages(id, sender_id, recipient_id, content, created_at)
		VALUES(?, ?, ?, ?, ?)
	`, messageID, sess.UserID, body.RecipientID, body.Content, createdAt)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Get sender name for the message
	var senderName string
	_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&senderName)

	// Create message object for WebSocket
	message := websocket.Message{
		Type:        "direct",
		ID:          messageID,
		SenderID:    sess.UserID,
		SenderName:  senderName,
		RecipientID: body.RecipientID,
		Content:     body.Content,
		CreatedAt:   createdAt,
	}

	// Send via WebSocket
	h.Hub.SendMessage(message)

	// Return the created message
	_ = json.NewEncoder(w).Encode(message)
}

// SendGroupMessage sends a message to a group
func (h *ChatHandler) SendGroupMessage(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	groupID := chi.URLParam(r, "id")

	// Check if user is a member of the group
	var isMember bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM group_members 
			WHERE group_id = ? AND user_id = ?
		) OR EXISTS(
			SELECT 1 FROM groups 
			WHERE id = ? AND owner_user_id = ?
		)
	`, groupID, sess.UserID, groupID, sess.UserID).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var body sendMessageReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Content == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	messageID := uuid.NewString()
	createdAt := time.Now().Format("2006-01-02T15:04:05Z")

	// Save message to database
	_, err = h.DB.Exec(`
		INSERT INTO group_messages(id, group_id, sender_id, content, created_at)
		VALUES(?, ?, ?, ?, ?)
	`, messageID, groupID, sess.UserID, body.Content, createdAt)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Get sender name for the message
	var senderName string
	_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&senderName)

	// Create message object for WebSocket
	message := websocket.Message{
		Type:       "group",
		ID:         messageID,
		SenderID:   sess.UserID,
		SenderName: senderName,
		GroupID:    groupID,
		Content:    body.Content,
		CreatedAt:  createdAt,
	}

	// Send via WebSocket
	h.Hub.SendMessage(message)

	// Return the created message
	_ = json.NewEncoder(w).Encode(message)
}

// ListDirectMessages gets direct messages between two users
func (h *ChatHandler) ListDirectMessages(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	otherUserID := chi.URLParam(r, "userId")

	rows, err := h.DB.Query(`
		SELECT dm.id, dm.sender_id, dm.recipient_id, dm.content, dm.created_at, dm.read_at,
		       u.first_name, u.last_name
		FROM direct_messages dm
		JOIN users u ON u.id = dm.sender_id
		WHERE (dm.sender_id = ? AND dm.recipient_id = ?) 
		   OR (dm.sender_id = ? AND dm.recipient_id = ?)
		ORDER BY dm.created_at ASC
		LIMIT 100
	`, sess.UserID, otherUserID, otherUserID, sess.UserID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type message struct {
		ID          string `json:"id"`
		SenderID    string `json:"sender_id"`
		SenderName  string `json:"sender_name"`
		RecipientID string `json:"recipient_id"`
		Content     string `json:"content"`
		CreatedAt   string `json:"created_at"`
		ReadAt      string `json:"read_at"`
		IsFromMe    bool   `json:"is_from_me"`
	}

	var messages []message
	for rows.Next() {
		var m message
		var firstName, lastName string
		var readAt sql.NullString

		_ = rows.Scan(&m.ID, &m.SenderID, &m.RecipientID, &m.Content, &m.CreatedAt, &readAt, &firstName, &lastName)

		m.SenderName = firstName + " " + lastName
		m.IsFromMe = m.SenderID == sess.UserID

		if readAt.Valid {
			m.ReadAt = readAt.String
		}

		messages = append(messages, m)
	}

	_ = json.NewEncoder(w).Encode(messages)
}

// ListGroupMessages gets messages for a group
func (h *ChatHandler) ListGroupMessages(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	groupID := chi.URLParam(r, "id")

	// Check if user is a member of the group
	var isMember bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM group_members 
			WHERE group_id = ? AND user_id = ?
		) OR EXISTS(
			SELECT 1 FROM groups 
			WHERE id = ? AND owner_user_id = ?
		)
	`, groupID, sess.UserID, groupID, sess.UserID).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	rows, err := h.DB.Query(`
		SELECT gm.id, gm.sender_id, gm.content, gm.created_at,
		       u.first_name, u.last_name
		FROM group_messages gm
		JOIN users u ON u.id = gm.sender_id
		WHERE gm.group_id = ?
		ORDER BY gm.created_at ASC
		LIMIT 100
	`, groupID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type message struct {
		ID         string `json:"id"`
		SenderID   string `json:"sender_id"`
		SenderName string `json:"sender_name"`
		Content    string `json:"content"`
		CreatedAt  string `json:"created_at"`
		IsFromMe   bool   `json:"is_from_me"`
	}

	var messages []message
	for rows.Next() {
		var m message
		var firstName, lastName string

		_ = rows.Scan(&m.ID, &m.SenderID, &m.Content, &m.CreatedAt, &firstName, &lastName)

		m.SenderName = firstName + " " + lastName
		m.IsFromMe = m.SenderID == sess.UserID

		messages = append(messages, m)
	}

	_ = json.NewEncoder(w).Encode(messages)
}

// MarkMessageAsRead marks a direct message as read
func (h *ChatHandler) MarkMessageAsRead(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	messageID := chi.URLParam(r, "messageId")

	// Update read_at timestamp
	_, err := h.DB.Exec(`
		UPDATE direct_messages 
		SET read_at = CURRENT_TIMESTAMP 
		WHERE id = ? AND recipient_id = ?
	`, messageID, sess.UserID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// GetConversations gets all conversations for the current user
func (h *ChatHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	// Simple test - just return empty array
	conversations := []map[string]interface{}{}
	_ = json.NewEncoder(w).Encode(conversations)
}
