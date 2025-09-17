package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
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
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if body.Content == "" || body.RecipientID == "" {
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
		INSERT INTO direct_messages(id, from_user_id, to_user_id, text, created_at)
		VALUES(?, ?, ?, ?, ?)
	`, messageID, sess.UserID, body.RecipientID, body.Content, createdAt)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Create notification for the recipient
	notificationID := uuid.NewString()
	_, _ = h.DB.Exec(`
		INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id, created_at)
		VALUES(?, ?, 'message', ?, ?, ?)
	`, notificationID, body.RecipientID, sess.UserID, messageID, createdAt)

	// Get sender name for WebSocket message
	var senderName string
	_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&senderName)

	// Send via WebSocket to recipient
	wsMessage := map[string]interface{}{
		"type":         "direct",
		"id":           messageID,
		"sender_id":    sess.UserID,
		"sender_name":  senderName,
		"recipient_id": body.RecipientID,
		"content":      body.Content,
		"created_at":   createdAt,
	}

	messageBytes, _ := json.Marshal(wsMessage)
	h.Hub.BroadcastToUser(body.RecipientID, messageBytes)

	// Return success response
	response := map[string]interface{}{
		"id":           messageID,
		"sender_id":    sess.UserID,
		"sender_name":  senderName,
		"recipient_id": body.RecipientID,
		"content":      body.Content,
		"created_at":   createdAt,
		"status":       "sent",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
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
	log.Printf("Sending group message - groupID: %s, userID: %s, content: %s", groupID, sess.UserID, body.Content)
	_, err = h.DB.Exec(`
		INSERT INTO group_messages(id, group_id, from_user_id, text, created_at)
		VALUES(?, ?, ?, ?, ?)
	`, messageID, groupID, sess.UserID, body.Content, createdAt)

	if err != nil {
		log.Printf("Error saving group message: %v", err)
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

	// Send via WebSocket to all group members
	messageBytes, _ := json.Marshal(message)
	h.Hub.BroadcastToGroup(groupID, messageBytes)

	// Return the created message
	_ = json.NewEncoder(w).Encode(message)
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

	// Get messages for the group
	rows, err := h.DB.Query(`
		SELECT gm.id, gm.text, gm.from_user_id, gm.created_at,
		       u.first_name, u.last_name
		FROM group_messages gm
		JOIN users u ON u.id = gm.from_user_id
		WHERE gm.group_id = ?
		ORDER BY gm.created_at ASC
		LIMIT 100
	`, groupID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type groupMessage struct {
		ID         string `json:"id"`
		Content    string `json:"content"`
		SenderID   string `json:"sender_id"`
		SenderName string `json:"sender_name"`
		CreatedAt  string `json:"created_at"`
		IsFromMe   bool   `json:"is_from_me"`
	}

	var messages []groupMessage
	for rows.Next() {
		var msg groupMessage
		var firstName, lastName string

		err := rows.Scan(&msg.ID, &msg.Content, &msg.SenderID, &msg.CreatedAt, &firstName, &lastName)
		if err != nil {
			continue
		}

		msg.SenderName = firstName + " " + lastName
		msg.IsFromMe = msg.SenderID == sess.UserID

		messages = append(messages, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(messages)
}

// GetGroupConversations gets groups that the user can chat in
func (h *ChatHandler) GetGroupConversations(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get groups where user is a member or owner
	rows, err := h.DB.Query(`
		SELECT g.id, g.title, g.description,
		       MAX(gm.created_at) as last_message_at,
		       0 as unread_count
		FROM groups g
		LEFT JOIN group_members gm_member ON g.id = gm_member.group_id AND gm_member.user_id = ?
		LEFT JOIN group_messages gm ON g.id = gm.group_id
		WHERE g.owner_user_id = ? OR gm_member.user_id = ?
		GROUP BY g.id, g.title, g.description
		ORDER BY last_message_at DESC NULLS LAST
		LIMIT 50
	`, sess.UserID, sess.UserID, sess.UserID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type groupConversation struct {
		GroupID       string `json:"group_id"`
		GroupName     string `json:"group_name"`
		LastMessageAt string `json:"last_message_at"`
		UnreadCount   int    `json:"unread_count"`
	}

	var conversations []groupConversation
	for rows.Next() {
		var c groupConversation
		var groupTitle, groupDescription string
		var lastMessageAt sql.NullString

		err := rows.Scan(&c.GroupID, &groupTitle, &groupDescription, &lastMessageAt, &c.UnreadCount)
		if err != nil {
			continue
		}

		c.GroupName = groupTitle
		c.LastMessageAt = lastMessageAt.String

		conversations = append(conversations, c)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(conversations)
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
		SELECT dm.id, dm.from_user_id, dm.to_user_id, dm.text, dm.created_at, dm.read_at,
		       u.first_name, u.last_name
		FROM direct_messages dm
		JOIN users u ON u.id = dm.from_user_id
		WHERE (dm.from_user_id = ? AND dm.to_user_id = ?) 
		   OR (dm.from_user_id = ? AND dm.to_user_id = ?)
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

// MarkMessageAsRead marks a direct message as read
func (h *ChatHandler) MarkMessageAsRead(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	messageID := chi.URLParam(r, "messageId")
	log.Printf("MarkMessageAsRead - messageID: %s, userID: %s", messageID, sess.UserID)

	// Check if message exists first
	var exists bool
	err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM direct_messages WHERE id = ?)", messageID).Scan(&exists)
	if err != nil {
		log.Printf("Error checking if message exists: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	if !exists {
		log.Printf("Message %s does not exist", messageID)
		http.Error(w, "message not found", http.StatusNotFound)
		return
	}

	// Update read_at timestamp
	result, err := h.DB.Exec(`
		UPDATE direct_messages 
		SET read_at = CURRENT_TIMESTAMP 
		WHERE id = ? AND to_user_id = ?
	`, messageID, sess.UserID)

	if err != nil {
		log.Printf("Error updating message read_at: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("MarkMessageAsRead - rows affected: %d", rowsAffected)

	_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// GetConversations gets all conversations for the current user
func (h *ChatHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get all unique users that the current user has had conversations with
	rows, err := h.DB.Query(`
		SELECT DISTINCT 
			CASE 
				WHEN dm.from_user_id = ? THEN dm.to_user_id
				ELSE dm.from_user_id
			END as other_user_id,
			u.first_name, u.last_name,
			MAX(dm.created_at) as last_message_at,
			COUNT(CASE WHEN dm.to_user_id = ? AND (dm.read_at IS NULL OR dm.read_at = '') THEN 1 END) as unread_count
		FROM direct_messages dm
		JOIN users u ON u.id = CASE 
			WHEN dm.from_user_id = ? THEN dm.to_user_id
			ELSE dm.from_user_id
		END
		WHERE dm.from_user_id = ? OR dm.to_user_id = ?
		GROUP BY other_user_id, u.first_name, u.last_name
		ORDER BY last_message_at DESC
		LIMIT 50
	`, sess.UserID, sess.UserID, sess.UserID, sess.UserID, sess.UserID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type conversation struct {
		UserID        string `json:"user_id"`
		UserName      string `json:"user_name"`
		LastMessageAt string `json:"last_message_at"`
		LastMessage   string `json:"last_message"`
		UnreadCount   int    `json:"unread_count"`
	}

	var conversations []conversation
	for rows.Next() {
		var c conversation
		var firstName, lastName string
		_ = rows.Scan(&c.UserID, &firstName, &lastName, &c.LastMessageAt, &c.UnreadCount)
		c.UserName = firstName + " " + lastName
		conversations = append(conversations, c)
	}

	_ = json.NewEncoder(w).Encode(conversations)
}
