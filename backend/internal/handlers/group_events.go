package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GroupEventsHandler struct {
	DB                  *sql.DB
	NotificationService *services.NotificationService
}

type createEventReq struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	EventDate   string `json:"event_date"`
	Location    string `json:"location"`
}

type eventResponseReq struct {
	Response string `json:"response"`
}

// CreateEvent creates a new group event
func (h *GroupEventsHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
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

	var body createEventReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" || body.EventDate == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Parse and validate event date
	eventDate, err := time.Parse("2006-01-02T15:04", body.EventDate)
	if err != nil {
		http.Error(w, "invalid date format", http.StatusBadRequest)
		return
	}

	eventID := uuid.NewString()
	_, err = h.DB.Exec(`
		INSERT INTO group_events(id, group_id, created_by, title, description, event_date, location)
		VALUES(?, ?, ?, ?, ?, ?, ?)
	`, eventID, groupID, sess.UserID, body.Title, body.Description, eventDate.Format("2006-01-02 15:04:05"), body.Location)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Notify group members about the new event (live via WebSocket)
	if h.NotificationService != nil {
		var groupTitle, creatorName string
		_ = h.DB.QueryRow("SELECT title FROM groups WHERE id = ?", groupID).Scan(&groupTitle)
		_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&creatorName)
		if creatorName == "" {
			creatorName = "Someone"
		}
		message := creatorName + " created a new event in " + groupTitle
		_ = h.NotificationService.CreateGroupActivityNotification(sess.UserID, groupID, "group_event_created", message)
	}

	// Return the created event
	eventData := map[string]interface{}{
		"ID":          eventID,
		"GroupID":     groupID,
		"CreatedBy":   sess.UserID,
		"Title":       body.Title,
		"Description": body.Description,
		"EventDate":   eventDate.Format("2006-01-02T15:04:05Z"),
		"Location":    body.Location,
		"CreatedAt":   time.Now().Format("2006-01-02T15:04:05Z"),
	}

	_ = json.NewEncoder(w).Encode(eventData)
}

// ListEvents lists all events for a group
func (h *GroupEventsHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	groupID := chi.URLParam(r, "id")

	rows, err := h.DB.Query(`
		SELECT ge.id, ge.group_id, ge.created_by, ge.title, ge.description, 
		       ge.event_date, ge.location, ge.created_at,
		       u.first_name, u.last_name,
		       COUNT(CASE WHEN ger.response = 'going' THEN 1 END) as going_count,
		       COUNT(CASE WHEN ger.response = 'not_going' THEN 1 END) as not_going_count,
		       COUNT(CASE WHEN ger.response = 'maybe' THEN 1 END) as maybe_count
		FROM group_events ge
		JOIN users u ON u.id = ge.created_by
		LEFT JOIN group_event_responses ger ON ger.event_id = ge.id
		WHERE ge.group_id = ?
		GROUP BY ge.id, ge.group_id, ge.created_by, ge.title, ge.description, 
		         ge.event_date, ge.location, ge.created_at, u.first_name, u.last_name
		ORDER BY ge.event_date ASC
	`, groupID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type event struct {
		ID            string `json:"id"`
		GroupID       string `json:"group_id"`
		CreatedBy     string `json:"created_by"`
		CreatedByName string `json:"created_by_name"`
		Title         string `json:"title"`
		Description   string `json:"description"`
		EventDate     string `json:"event_date"`
		Location      string `json:"location"`
		CreatedAt     string `json:"created_at"`
		GoingCount    int    `json:"going_count"`
		NotGoingCount int    `json:"not_going_count"`
		MaybeCount    int    `json:"maybe_count"`
	}

	var events []event
	for rows.Next() {
		var e event
		var firstName, lastName string
		_ = rows.Scan(&e.ID, &e.GroupID, &e.CreatedBy, &e.Title, &e.Description,
			&e.EventDate, &e.Location, &e.CreatedAt, &firstName, &lastName,
			&e.GoingCount, &e.NotGoingCount, &e.MaybeCount)
		e.CreatedByName = firstName + " " + lastName
		events = append(events, e)
	}

	_ = json.NewEncoder(w).Encode(events)
}

// RespondToEvent handles user responses to events
func (h *GroupEventsHandler) RespondToEvent(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	eventID := chi.URLParam(r, "eventId")

	// Check if user is a member of the group
	var groupID string
	err := h.DB.QueryRow(`
		SELECT ge.group_id 
		FROM group_events ge
		JOIN group_members gm ON gm.group_id = ge.group_id
		WHERE ge.id = ? AND gm.user_id = ?
		UNION
		SELECT ge.group_id 
		FROM group_events ge
		JOIN groups g ON g.id = ge.group_id
		WHERE ge.id = ? AND g.owner_user_id = ?
	`, eventID, sess.UserID, eventID, sess.UserID).Scan(&groupID)

	if err != nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var body eventResponseReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if body.Response != "going" && body.Response != "not_going" && body.Response != "maybe" {
		http.Error(w, "invalid response", http.StatusBadRequest)
		return
	}

	responseID := uuid.NewString()
	_, err = h.DB.Exec(`
		INSERT OR REPLACE INTO group_event_responses(id, event_id, user_id, response)
		VALUES(?, ?, ?, ?)
	`, responseID, eventID, sess.UserID, body.Response)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Notify event creator about the response
	h.notifyEventCreator(eventID, sess.UserID, body.Response)

	_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// GetEventResponses gets all responses for an event
func (h *GroupEventsHandler) GetEventResponses(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "eventId")

	rows, err := h.DB.Query(`
		SELECT ger.id, ger.user_id, ger.response, ger.created_at,
		       u.first_name, u.last_name
		FROM group_event_responses ger
		JOIN users u ON u.id = ger.user_id
		WHERE ger.event_id = ?
		ORDER BY ger.created_at ASC
	`, eventID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type response struct {
		ID        string `json:"id"`
		UserID    string `json:"user_id"`
		UserName  string `json:"user_name"`
		Response  string `json:"response"`
		CreatedAt string `json:"created_at"`
	}

	var responses []response
	for rows.Next() {
		var r response
		var firstName, lastName string
		_ = rows.Scan(&r.ID, &r.UserID, &r.Response, &r.CreatedAt, &firstName, &lastName)
		r.UserName = firstName + " " + lastName
		responses = append(responses, r)
	}

	_ = json.NewEncoder(w).Encode(responses)
}

// Helper function to notify group members about new events
func (h *GroupEventsHandler) notifyGroupMembers(groupID, creatorID, eventType, subjectID string) {
	if h.NotificationService == nil {
		return
	}

	// Get group title and creator name
	var groupTitle, creatorName string
	_ = h.DB.QueryRow("SELECT title FROM groups WHERE id = ?", groupID).Scan(&groupTitle)
	_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", creatorID).Scan(&creatorName)
	if creatorName == "" {
		creatorName = "Someone"
	}

	var message string
	switch eventType {
	case "group_event_created":
		message = creatorName + " created a new event in " + groupTitle
	case "group_event_updated":
		message = creatorName + " updated an event in " + groupTitle
	}

	// Get all group members except the creator
	rows, err := h.DB.Query(`
		SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?
		UNION
		SELECT owner_user_id as user_id FROM groups WHERE id = ? AND owner_user_id != ?
	`, groupID, creatorID, groupID, creatorID)

	if err != nil {
		log.Printf("Error getting group members for event notification: %v", err)
		return
	}
	defer rows.Close()

	// Create notifications for each group member (excluding creator)
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			continue
		}

		// Create notification for this user
		data := services.NotificationData{
			Type:        eventType,
			ActorUserID: creatorID,
			SubjectID:   subjectID,
			UserID:      userID,
			Message:     message,
			ActionURL:   "/groups/" + groupID + "?tab=events",
		}

		if err := h.NotificationService.CreateNotification(data); err != nil {
			log.Printf("Error creating event notification for user %s: %v", userID, err)
		}
	}
}

// Helper function to notify event creator about responses
func (h *GroupEventsHandler) notifyEventCreator(eventID, responderID, response string) {
	var creatorID string
	_ = h.DB.QueryRow("SELECT created_by FROM group_events WHERE id = ?", eventID).Scan(&creatorID)

	if creatorID != responderID {
		_, _ = h.DB.Exec(`
			INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id)
			VALUES(?, ?, ?, ?, ?)
		`, uuid.NewString(), creatorID, "event_response", responderID, eventID)
	}
}

// UpdateEvent updates a group event (only by the creator)
func (h *GroupEventsHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	eventID := chi.URLParam(r, "eventId")

	// Check if user created this event
	var creatorID string
	err := h.DB.QueryRow("SELECT created_by FROM group_events WHERE id = ?", eventID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if creatorID != sess.UserID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var body createEventReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" || body.EventDate == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Parse and validate event date
	eventDate, err := time.Parse("2006-01-02T15:04", body.EventDate)
	if err != nil {
		http.Error(w, "invalid date format", http.StatusBadRequest)
		return
	}

	// Update the event
	_, err = h.DB.Exec(`
		UPDATE group_events 
		SET title = ?, description = ?, event_date = ?, location = ?
		WHERE id = ?
	`, body.Title, body.Description, eventDate.Format("2006-01-02 15:04:05"), body.Location, eventID)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Get group ID for notification
	var groupID string
	_ = h.DB.QueryRow("SELECT group_id FROM group_events WHERE id = ?", eventID).Scan(&groupID)

	// Notify group members about the event update
	h.notifyGroupMembers(groupID, sess.UserID, "group_event_updated", eventID)

	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Event updated successfully"})
}

// DeleteEvent deletes a group event (only by the creator)
func (h *GroupEventsHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	eventID := chi.URLParam(r, "eventId")

	// Check if user created this event
	var creatorID string
	err := h.DB.QueryRow("SELECT created_by FROM group_events WHERE id = ?", eventID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if creatorID != sess.UserID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Delete the event (cascade will handle related data)
	_, err = h.DB.Exec("DELETE FROM group_events WHERE id = ?", eventID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Event deleted successfully"})
}
