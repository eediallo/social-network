package services

import (
	"database/sql"
	"encoding/json"
	"log"
	"time"

	"social-network/backend/internal/websocket"
)

type NotificationService struct {
	DB  *sql.DB
	Hub *websocket.Hub
}

type NotificationData struct {
	Type        string `json:"type"`
	ActorUserID string `json:"actor_user_id"`
	SubjectID   string `json:"subject_id"`
	UserID      string `json:"user_id"`
	Message     string `json:"message"`
	ActionURL   string `json:"action_url"`
}

func NewNotificationService(db *sql.DB, hub *websocket.Hub) *NotificationService {
	return &NotificationService{
		DB:  db,
		Hub: hub,
	}
}

// CreateNotification creates a notification and broadcasts it via WebSocket
func (ns *NotificationService) CreateNotification(data NotificationData) error {
	// Insert notification into database (without message and action_url columns)
	_, err := ns.DB.Exec(`
		INSERT INTO notifications (type, actor_user_id, subject_id, user_id, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, data.Type, data.ActorUserID, data.SubjectID, data.UserID, time.Now())

	if err != nil {
		log.Printf("Error creating notification: %v", err)
		return err
	}

	// Get actor name for the notification
	var actorName string
	err = ns.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", data.ActorUserID).Scan(&actorName)
	if err != nil {
		actorName = "Someone"
	}

	// Create notification object for WebSocket
	notification := map[string]interface{}{
		"type":          data.Type,
		"actor_user_id": data.ActorUserID,
		"actor_name":    actorName,
		"subject_id":    data.SubjectID,
		"created_at":    time.Now().Format(time.RFC3339),
		"read_at":       "",
		"message":       data.Message,
		"action_url":    data.ActionURL,
	}

	// Create WebSocket message
	wsNotification := map[string]interface{}{
		"type":         "notification",
		"notification": notification,
	}

	// Broadcast notification via WebSocket
	notificationBytes, err := json.Marshal(wsNotification)
	if err != nil {
		log.Printf("Error marshaling notification: %v", err)
		return err
	}

	ns.Hub.BroadcastNotification(data.UserID, notificationBytes)
	return nil
}

// CreateGroupNotification creates a notification for all group members
func (ns *NotificationService) CreateGroupNotification(groupID string, data NotificationData) error {
	// Get all group members
	rows, err := ns.DB.Query(`
		SELECT user_id FROM group_members WHERE group_id = ?
		UNION
		SELECT owner_user_id as user_id FROM groups WHERE id = ?
	`, groupID, groupID)
	if err != nil {
		return err
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		userIDs = append(userIDs, userID)
	}

	// Create notification for each group member
	for _, userID := range userIDs {
		// Skip the actor themselves
		if userID == data.ActorUserID {
			continue
		}

		groupData := data
		groupData.UserID = userID
		groupData.SubjectID = groupID

		if err := ns.CreateNotification(groupData); err != nil {
			log.Printf("Error creating group notification for user %s: %v", userID, err)
		}
	}

	return nil
}

// CreateFollowNotification creates a notification for follow-related activities
func (ns *NotificationService) CreateFollowNotification(actorUserID, targetUserID, notificationType, message string) error {
	var actionURL string
	switch notificationType {
	case "follow_request":
		actionURL = "/requests" // Go to requests management page
	case "follow_accepted":
		actionURL = "/profile/" + actorUserID // Go to the person who accepted
	}

	data := NotificationData{
		Type:        notificationType,
		ActorUserID: actorUserID,
		SubjectID:   targetUserID,
		UserID:      targetUserID,
		Message:     message,
		ActionURL:   actionURL,
	}

	return ns.CreateNotification(data)
}

// CreatePostNotification creates a notification for post-related activities
func (ns *NotificationService) CreatePostNotification(actorUserID, postID, targetUserID, notificationType, message string) error {
	var actionURL string
	switch notificationType {
	case "comment":
		actionURL = "/feed?post=" + postID // Go to specific post in feed
	case "like":
		actionURL = "/feed?post=" + postID // Go to specific post in feed
	}

	data := NotificationData{
		Type:        notificationType,
		ActorUserID: actorUserID,
		SubjectID:   postID,
		UserID:      targetUserID,
		Message:     message,
		ActionURL:   actionURL,
	}

	return ns.CreateNotification(data)
}

// CreateGroupActivityNotification creates a notification for group activities
func (ns *NotificationService) CreateGroupActivityNotification(actorUserID, groupID, notificationType, message string) error {
	var actionURL string
	switch notificationType {
	case "group_created":
		actionURL = "/groups/" + groupID // Go to the new group
	case "group_message":
		actionURL = "/messages?group=" + groupID // Go to group chat
	case "group_event_created":
		actionURL = "/groups/" + groupID + "?tab=events" // Go to group events tab
	case "group_join_request":
		actionURL = "/groups/" + groupID + "?tab=requests" // Go to group requests management
	case "group_join_accepted":
		actionURL = "/groups/" + groupID // Go to the group
	case "group_invite":
		actionURL = "/invitations" // Go to invitations page
	}

	data := NotificationData{
		Type:        notificationType,
		ActorUserID: actorUserID,
		SubjectID:   groupID,
		UserID:      "", // Will be set by CreateGroupNotification
		Message:     message,
		ActionURL:   actionURL,
	}

	return ns.CreateGroupNotification(groupID, data)
}

// CreateEventNotification creates a notification for event activities
func (ns *NotificationService) CreateEventNotification(actorUserID, eventID, groupID, notificationType, message string) error {
	var actionURL string
	switch notificationType {
	case "event_created":
		actionURL = "/groups/" + groupID + "?tab=events" // Go to group events tab
	case "event_updated":
		actionURL = "/groups/" + groupID + "?tab=events" // Go to group events tab
	case "event_response":
		actionURL = "/groups/" + groupID + "?tab=events" // Go to group events tab
	}

	data := NotificationData{
		Type:        notificationType,
		ActorUserID: actorUserID,
		SubjectID:   eventID,
		UserID:      "", // Will be set by CreateGroupNotification
		Message:     message,
		ActionURL:   actionURL,
	}

	return ns.CreateGroupNotification(groupID, data)
}
