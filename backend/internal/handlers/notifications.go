package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/websocket"
)

type NotificationsHandler struct {
	DB  *sql.DB
	Hub *websocket.Hub
}

func (h *NotificationsHandler) List(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Enhanced query to get notification details with actor and subject information
	rows, err := h.DB.Query(`
		SELECT n.id, n.type, n.actor_user_id, n.subject_id, n.created_at, n.read_at,
		       n.message, n.action_url,
		       u.first_name, u.last_name,
		       CASE 
		         WHEN n.type = 'group_invite' THEN g.title
		         WHEN n.type = 'group_join_request' THEN g.title
		         WHEN n.type = 'group_join_accepted' THEN g.title
		         WHEN n.type = 'group_join_declined' THEN g.title
		         WHEN n.type = 'comment' THEN p.text
		         WHEN n.type = 'follow_request' THEN 'Follow Request'
		         WHEN n.type = 'follow_accepted' THEN 'Follow Accepted'
		         WHEN n.type = 'message' THEN 'New Message'
		         ELSE NULL
		       END as subject_title
		FROM notifications n
		LEFT JOIN users u ON u.id = n.actor_user_id
		LEFT JOIN groups g ON g.id = n.subject_id
		LEFT JOIN posts p ON p.id = n.subject_id AND n.type = 'comment'
		WHERE n.user_id = ? 
		ORDER BY n.created_at DESC 
		LIMIT 100
	`, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Debug logging removed for production
	defer rows.Close()

	type notification struct {
		ID           string `json:"id"`
		Type         string `json:"type"`
		ActorID      string `json:"actor_user_id"`
		ActorName    string `json:"actor_name"`
		SubjectID    string `json:"subject_id"`
		SubjectTitle string `json:"subject_title"`
		CreatedAt    string `json:"created_at"`
		ReadAt       string `json:"read_at"`
		Message      string `json:"message"`
		ActionURL    string `json:"action_url"`
	}

	var out []notification
	for rows.Next() {
		var n notification
		var firstName, lastName, subjectTitle string
		var readAt, message, actionURL sql.NullString

		// Scan all 11 columns
		err := rows.Scan(&n.ID, &n.Type, &n.ActorID, &n.SubjectID, &n.CreatedAt, &readAt,
			&message, &actionURL, &firstName, &lastName, &subjectTitle)
		if err != nil {
			// Handle scan error silently in production
			continue
		}

		// Handle read_at
		if readAt.Valid {
			n.ReadAt = readAt.String
		}

		// Use stored message and action_url if available, otherwise generate them
		if message.Valid && message.String != "" {
			n.Message = message.String
		} else {
			// Fallback to generated message
			if firstName != "" && lastName != "" {
				n.ActorName = firstName + " " + lastName
			} else {
				n.ActorName = "Unknown User"
			}

			// Build subject title
			if subjectTitle != "" {
				n.SubjectTitle = subjectTitle
			}

			// Generate message based on notification type
			switch n.Type {
			case "group_invite":
				n.Message = n.ActorName + " invited you to join " + n.SubjectTitle
			case "group_join_request":
				n.Message = n.ActorName + " wants to join " + n.SubjectTitle
			case "group_join_accepted":
				n.Message = "Your request to join " + n.SubjectTitle + " was accepted"
			case "group_join_declined":
				n.Message = "Your request to join " + n.SubjectTitle + " was declined"
			case "follow_request":
				n.Message = n.ActorName + " wants to follow you"
			case "follow_accepted":
				n.Message = n.ActorName + " accepted your follow request"
			case "comment":
				n.Message = n.ActorName + " commented on your post"
			case "message":
				n.Message = n.ActorName + " sent you a message"
			default:
				n.Message = "You have a new notification"
			}
		}

		if actionURL.Valid && actionURL.String != "" {
			n.ActionURL = actionURL.String
		} else {
			// Fallback to generated action URL
			switch n.Type {
			case "group_invite":
				n.ActionURL = "/invitations"
			case "group_join_request":
				n.ActionURL = "/groups/" + n.SubjectID + "?tab=requests"
			case "group_join_accepted":
				n.ActionURL = "/groups/" + n.SubjectID
			case "group_join_declined":
				n.ActionURL = "/groups"
			case "follow_request":
				n.ActionURL = "/requests"
			case "follow_accepted":
				n.ActionURL = "/profile/" + n.ActorID
			case "comment":
				n.ActionURL = "/feed"
			case "message":
				n.ActionURL = "/messages?user=" + n.ActorID
			default:
				n.ActionURL = "/notifications"
			}
		}

		// Build actor name for display
		if firstName != "" && lastName != "" {
			n.ActorName = firstName + " " + lastName
		} else {
			n.ActorName = "Unknown User"
		}

		// Build subject title for display
		if subjectTitle != "" {
			n.SubjectTitle = subjectTitle
		}

		out = append(out, n)
	}
	_ = json.NewEncoder(w).Encode(out)
}

func (h *NotificationsHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := h.DB.Exec("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", id, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *NotificationsHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	_, err := h.DB.Exec("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL", sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// BroadcastNotification sends a notification to a user via WebSocket
func (h *NotificationsHandler) BroadcastNotification(userID string, notification map[string]interface{}) {
	if h.Hub == nil {
		return
	}

	// Create the WebSocket message
	message := map[string]interface{}{
		"type":         "notification",
		"notification": notification,
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		return
	}

	// Broadcast to the user
	h.Hub.BroadcastNotification(userID, messageBytes)
}
