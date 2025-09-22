package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"social-network/backend/internal/auth"
	"social-network/backend/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GroupsHandler struct {
	DB                  *sql.DB
	NotificationService *services.NotificationService
}

type createGroupReq struct {
	Title, Description, Category string
	Tags                         []string `json:"tags"`
}

func (h *GroupsHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var body createGroupReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Set default category if not provided
	if body.Category == "" {
		body.Category = "general"
	}

	gid := uuid.NewString()
	if _, err := h.DB.Exec("INSERT INTO groups(id, owner_user_id, title, description, category) VALUES(?,?,?,?,?)",
		gid, sess.UserID, body.Title, body.Description, body.Category); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Add tags if provided
	if len(body.Tags) > 0 {
		for _, tag := range body.Tags {
			if tag != "" {
				tagID := uuid.NewString()
				_, _ = h.DB.Exec("INSERT INTO group_tags(id, group_id, tag) VALUES(?,?,?)",
					tagID, gid, strings.ToLower(strings.TrimSpace(tag)))
			}
		}
	}

	// owner is a member
	_, _ = h.DB.Exec("INSERT OR IGNORE INTO group_members(group_id, user_id, role) VALUES(?,?,'owner')", gid, sess.UserID)

	// Get the actual created timestamp from the database
	var createdAt string
	_ = h.DB.QueryRow("SELECT created_at FROM groups WHERE id = ?", gid).Scan(&createdAt)

	// Note: Group creation notifications are not sent to anyone since the creator is the only member initially
	// Notifications will be sent when others join the group or when the group is shared

	// Return the complete group data
	groupData := map[string]interface{}{
		"ID":          gid,
		"OwnerID":     sess.UserID,
		"Title":       body.Title,
		"Description": body.Description,
		"Category":    body.Category,
		"Tags":        body.Tags,
		"CreatedAt":   createdAt,
	}

	_ = json.NewEncoder(w).Encode(groupData)
}

func (h *GroupsHandler) ListGroups(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	search := r.URL.Query().Get("search")

	var query string
	var args []interface{}

	if search != "" {
		query = `
			SELECT g.id, g.owner_user_id, g.title, g.description, g.category, g.created_at,
			       COUNT(gm.user_id) as member_count,
			       CASE WHEN g.owner_user_id = ? THEN 'owner' ELSE gm.role END as user_role,
			       CASE WHEN g.owner_user_id = ? OR gm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_member
			FROM groups g
			LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
			WHERE g.title LIKE ? OR g.description LIKE ? OR g.category LIKE ?
			GROUP BY g.id, g.owner_user_id, g.title, g.description, g.category, g.created_at, user_role, is_member
			ORDER BY g.created_at DESC LIMIT 100
		`
		args = []interface{}{sess.UserID, sess.UserID, sess.UserID, "%" + search + "%", "%" + search + "%", "%" + search + "%"}
	} else {
		query = `
			SELECT g.id, g.owner_user_id, g.title, g.description, g.category, g.created_at,
			       COUNT(gm.user_id) as member_count,
			       CASE WHEN g.owner_user_id = ? THEN 'owner' ELSE gm.role END as user_role,
			       CASE WHEN g.owner_user_id = ? OR gm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_member
			FROM groups g
			LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
			GROUP BY g.id, g.owner_user_id, g.title, g.description, g.category, g.created_at, user_role, is_member
			ORDER BY g.created_at DESC LIMIT 100
		`
		args = []interface{}{sess.UserID, sess.UserID, sess.UserID}
	}

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type g struct {
		ID, OwnerID, Title, Description, Category, CreatedAt string
		MemberCount                                          int      `json:"member_count"`
		UserRole                                             string   `json:"user_role"`
		IsMember                                             int      `json:"is_member"`
		Tags                                                 []string `json:"tags"`
	}
	var out []g
	for rows.Next() {
		var x g
		_ = rows.Scan(&x.ID, &x.OwnerID, &x.Title, &x.Description, &x.Category, &x.CreatedAt, &x.MemberCount, &x.UserRole, &x.IsMember)

		// Fetch tags for this group
		tagRows, err := h.DB.Query("SELECT tag FROM group_tags WHERE group_id = ? ORDER BY tag", x.ID)
		if err == nil {
			defer tagRows.Close()
			for tagRows.Next() {
				var tag string
				if err := tagRows.Scan(&tag); err == nil {
					x.Tags = append(x.Tags, tag)
				}
			}
		}

		out = append(out, x)
	}
	_ = json.NewEncoder(w).Encode(out)
}

func (h *GroupsHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var owner, title, desc, created string
	if err := h.DB.QueryRow("SELECT owner_user_id, title, description, created_at FROM groups WHERE id = ?", id).Scan(&owner, &title, &desc, &created); err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id, "owner_user_id": owner, "title": title, "description": desc, "created_at": created})
}

type inviteReq struct {
	UserID string `json:"user_id"`
}

func (h *GroupsHandler) Invite(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	// only members can invite
	var count int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&count)
	if count == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var body inviteReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	iid := uuid.NewString()
	if _, err := h.DB.Exec("INSERT INTO group_invitations(id, group_id, from_user_id, to_user_id, status) VALUES(?,?,?,?, 'pending')", iid, gid, sess.UserID, body.UserID); err != nil {
		http.Error(w, "conflict", http.StatusConflict)
		return
	}
	// notify invited user
	_, _ = h.DB.Exec("INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id) VALUES(?,?,?,?,?)", uuid.NewString(), body.UserID, "group_invite", sess.UserID, gid)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": iid, "status": "pending"})
}

func (h *GroupsHandler) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	iid := chi.URLParam(r, "invID")
	var toUser string
	if err := h.DB.QueryRow("SELECT to_user_id FROM group_invitations WHERE id = ? AND group_id = ? AND status='pending'", iid, gid).Scan(&toUser); err != nil || toUser != sess.UserID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	_, _ = h.DB.Exec("INSERT OR IGNORE INTO group_members(group_id, user_id, role) VALUES(?,?,'member')", gid, sess.UserID)
	_, _ = h.DB.Exec("UPDATE group_invitations SET status='accepted' WHERE id = ?", iid)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}

func (h *GroupsHandler) DeclineInvitation(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	iid := chi.URLParam(r, "invID")
	_, err := h.DB.Exec("UPDATE group_invitations SET status='declined' WHERE id = ? AND group_id = ? AND to_user_id = ? AND status='pending'", iid, gid, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "declined"})
}

func (h *GroupsHandler) RequestJoin(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")

	// Check if user is already a member of the group
	var isMember bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM group_members 
			WHERE group_id = ? AND user_id = ?
		) OR EXISTS(
			SELECT 1 FROM groups 
			WHERE id = ? AND owner_user_id = ?
		)
	`, gid, sess.UserID, gid, sess.UserID).Scan(&isMember)

	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	if isMember {
		http.Error(w, "already a member", http.StatusConflict)
		return
	}

	// Check if there's already a pending request
	var existingStatus string
	err = h.DB.QueryRow("SELECT status FROM group_requests WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&existingStatus)

	if err == nil {
		// Request exists
		if existingStatus == "pending" {
			http.Error(w, "request already pending", http.StatusConflict)
			return
		} else if existingStatus == "accepted" {
			http.Error(w, "already a member", http.StatusConflict)
			return
		} else if existingStatus == "declined" {
			// Allow resubmitting a declined request
			_, err = h.DB.Exec("UPDATE group_requests SET status = 'pending', created_at = CURRENT_TIMESTAMP WHERE group_id = ? AND user_id = ?", gid, sess.UserID)
			if err != nil {
				http.Error(w, "server error", http.StatusInternalServerError)
				return
			}
		}
	} else {
		// No existing request, create new one
		rid := uuid.NewString()
		_, err = h.DB.Exec("INSERT INTO group_requests(id, group_id, user_id, status) VALUES(?,?,?, 'pending')", rid, gid, sess.UserID)
		if err != nil {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}
	}

	// notify group owner
	var owner string
	_ = h.DB.QueryRow("SELECT owner_user_id FROM groups WHERE id = ?", gid).Scan(&owner)
	if owner != "" && h.NotificationService != nil {
		// Get group title and actor name
		var groupTitle, actorName string
		_ = h.DB.QueryRow("SELECT title FROM groups WHERE id = ?", gid).Scan(&groupTitle)
		_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&actorName)
		if actorName == "" {
			actorName = "Someone"
		}

		message := actorName + " wants to join " + groupTitle
		h.NotificationService.CreateFollowNotification(sess.UserID, owner, "group_join_request", message)
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending"})
}

func (h *GroupsHandler) AcceptRequest(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	rid := chi.URLParam(r, "reqID")
	// only owner can accept
	var owner string
	if err := h.DB.QueryRow("SELECT owner_user_id FROM groups WHERE id = ?", gid).Scan(&owner); err != nil || owner != sess.UserID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var userID string
	if err := h.DB.QueryRow("SELECT user_id FROM group_requests WHERE id = ? AND group_id = ? AND status='pending'", rid, gid).Scan(&userID); err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	_, _ = h.DB.Exec("INSERT OR IGNORE INTO group_members(group_id, user_id, role) VALUES(?,?,'member')", gid, userID)
	_, _ = h.DB.Exec("UPDATE group_requests SET status='accepted' WHERE id = ?", rid)
	// notify requester
	_, _ = h.DB.Exec("INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id) VALUES(?,?,?,?,?)", uuid.NewString(), userID, "group_join_accepted", sess.UserID, rid)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}

func (h *GroupsHandler) DeclineRequest(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	rid := chi.URLParam(r, "reqID")
	var owner string
	if err := h.DB.QueryRow("SELECT owner_user_id FROM groups WHERE id = ?", gid).Scan(&owner); err != nil || owner != sess.UserID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	_, err := h.DB.Exec("UPDATE group_requests SET status='declined' WHERE id = ? AND group_id = ? AND status='pending'", rid, gid)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "declined"})
}

// List group members
func (h *GroupsHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	_, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")

	// Allow anyone to see group members (public information)
	// No need to check if user is member

	rows, err := h.DB.Query(`
		SELECT gm.user_id, gm.role, gm.joined_at, u.first_name, u.last_name
		FROM group_members gm
		JOIN users u ON u.id = gm.user_id
		WHERE gm.group_id = ?
		ORDER BY gm.joined_at ASC
	`, gid)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type member struct {
		UserID    string `json:"user_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
		JoinedAt  string `json:"joined_at"`
	}
	var out []member
	for rows.Next() {
		var m member
		_ = rows.Scan(&m.UserID, &m.Role, &m.JoinedAt, &m.FirstName, &m.LastName)
		out = append(out, m)
	}
	_ = json.NewEncoder(w).Encode(out)
}

// GetGroupAnalytics returns analytics for a group
func (h *GroupsHandler) GetGroupAnalytics(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")

	// Check if user is owner or member
	var isOwner, isMember bool
	_ = h.DB.QueryRow("SELECT owner_user_id = ? FROM groups WHERE id = ?", sess.UserID, gid).Scan(&isOwner)
	_ = h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)", gid, sess.UserID).Scan(&isMember)

	if !isOwner && !isMember {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Get member count
	var memberCount int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ?", gid).Scan(&memberCount)

	// Get posts count
	var postsCount int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM group_posts WHERE group_id = ?", gid).Scan(&postsCount)

	// Get events count
	var eventsCount int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM events WHERE group_id = ?", gid).Scan(&eventsCount)

	// Get recent activity (last 7 days)
	var recentPosts int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM group_posts WHERE group_id = ? AND created_at > datetime('now', '-7 days')", gid).Scan(&recentPosts)

	var recentComments int
	_ = h.DB.QueryRow(`
		SELECT COUNT(*) FROM group_comments gc 
		JOIN group_posts gp ON gp.id = gc.group_post_id 
		WHERE gp.group_id = ? AND gc.created_at > datetime('now', '-7 days')
	`, gid).Scan(&recentComments)

	analytics := map[string]interface{}{
		"member_count":    memberCount,
		"posts_count":     postsCount,
		"events_count":    eventsCount,
		"recent_posts":    recentPosts,
		"recent_comments": recentComments,
		"activity_score":  recentPosts + recentComments, // Simple activity score
	}

	_ = json.NewEncoder(w).Encode(analytics)
}

// UpdateMemberRole updates a member's role in the group
func (h *GroupsHandler) UpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	userID := chi.URLParam(r, "userId")

	// Check if current user is owner
	var isOwner bool
	_ = h.DB.QueryRow("SELECT owner_user_id = ? FROM groups WHERE id = ?", sess.UserID, gid).Scan(&isOwner)
	if !isOwner {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var body struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Validate role
	if body.Role != "admin" && body.Role != "member" {
		http.Error(w, "invalid role", http.StatusBadRequest)
		return
	}

	// Update role
	_, err := h.DB.Exec("UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?",
		body.Role, gid, userID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// RemoveMember removes a member from the group
func (h *GroupsHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	userID := chi.URLParam(r, "userId")

	// Check if current user is owner
	var isOwner bool
	_ = h.DB.QueryRow("SELECT owner_user_id = ? FROM groups WHERE id = ?", sess.UserID, gid).Scan(&isOwner)
	if !isOwner {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Can't remove the owner
	if userID == sess.UserID {
		http.Error(w, "cannot remove owner", http.StatusBadRequest)
		return
	}

	// Remove member
	_, err := h.DB.Exec("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", gid, userID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{"status": "removed"})
}

// GetGroupCategories returns available group categories
func (h *GroupsHandler) GetGroupCategories(w http.ResponseWriter, r *http.Request) {
	categories := []string{
		"general", "technology", "photography", "fitness", "books",
		"music", "art", "travel", "food", "gaming", "education",
		"business", "sports", "health", "lifestyle", "entertainment",
	}
	_ = json.NewEncoder(w).Encode(categories)
}

// GetPopularTags returns popular group tags
func (h *GroupsHandler) GetPopularTags(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT tag, COUNT(*) as count 
		FROM group_tags 
		GROUP BY tag 
		ORDER BY count DESC 
		LIMIT 20
	`)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type tagCount struct {
		Tag   string `json:"tag"`
		Count int    `json:"count"`
	}

	var tags []tagCount
	for rows.Next() {
		var tc tagCount
		_ = rows.Scan(&tc.Tag, &tc.Count)
		tags = append(tags, tc)
	}

	_ = json.NewEncoder(w).Encode(tags)
}

// List sent invitations by the current user
func (h *GroupsHandler) ListSentInvitations(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := h.DB.Query(`
		SELECT gi.id, gi.group_id, gi.to_user_id, gi.status, gi.created_at,
		       g.title as group_title, g.description as group_description,
		       u.first_name, u.last_name
		FROM group_invitations gi
		JOIN groups g ON g.id = gi.group_id
		JOIN users u ON u.id = gi.to_user_id
		WHERE gi.from_user_id = ?
		ORDER BY gi.created_at DESC
	`, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type sentInvitation struct {
		ID         string `json:"id"`
		GroupID    string `json:"group_id"`
		GroupTitle string `json:"group_title"`
		GroupDesc  string `json:"group_description"`
		ToUserID   string `json:"to_user_id"`
		ToUserName string `json:"to_user_name"`
		Status     string `json:"status"`
		CreatedAt  string `json:"created_at"`
	}
	var out []sentInvitation
	for rows.Next() {
		var inv sentInvitation
		var firstName, lastName string
		_ = rows.Scan(&inv.ID, &inv.GroupID, &inv.ToUserID, &inv.Status, &inv.CreatedAt,
			&inv.GroupTitle, &inv.GroupDesc, &firstName, &lastName)
		inv.ToUserName = firstName + " " + lastName
		out = append(out, inv)
	}
	_ = json.NewEncoder(w).Encode(out)
}

// List received group invitations for the current user
func (h *GroupsHandler) ListReceivedInvitations(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := h.DB.Query(`
		SELECT gi.id, gi.group_id, gi.from_user_id, gi.status, gi.created_at,
		       g.title as group_title, g.description as group_description,
		       u.first_name, u.last_name
		FROM group_invitations gi
		JOIN groups g ON g.id = gi.group_id
		JOIN users u ON u.id = gi.from_user_id
		WHERE gi.to_user_id = ? AND gi.status = 'pending'
		ORDER BY gi.created_at DESC
	`, sess.UserID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type receivedInvitation struct {
		ID           string `json:"id"`
		GroupID      string `json:"group_id"`
		GroupTitle   string `json:"group_title"`
		GroupDesc    string `json:"group_description"`
		FromUserID   string `json:"from_user_id"`
		FromUserName string `json:"from_user_name"`
		Status       string `json:"status"`
		CreatedAt    string `json:"created_at"`
	}
	var out []receivedInvitation
	for rows.Next() {
		var inv receivedInvitation
		var firstName, lastName string
		_ = rows.Scan(&inv.ID, &inv.GroupID, &inv.FromUserID, &inv.Status, &inv.CreatedAt,
			&inv.GroupTitle, &inv.GroupDesc, &firstName, &lastName)
		inv.FromUserName = firstName + " " + lastName
		out = append(out, inv)
	}
	_ = json.NewEncoder(w).Encode(out)
}

// Search users for invitations
func (h *GroupsHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query parameter required", http.StatusBadRequest)
		return
	}

	// Search users by name (excluding current user)
	rows, err := h.DB.Query(`
		SELECT u.id, u.first_name, u.last_name, u.email, p.cloudinary_avatar_secure_url
		FROM users u
		LEFT JOIN profiles p ON p.user_id = u.id
		WHERE u.id != ? AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
		ORDER BY u.first_name, u.last_name
		LIMIT 20
	`, sess.UserID, "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type user struct {
		ID        string `json:"id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}
	var out []user
	for rows.Next() {
		var u user
		var avatarURL sql.NullString
		_ = rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Email, &avatarURL)
		u.AvatarURL = avatarURL.String
		out = append(out, u)
	}
	_ = json.NewEncoder(w).Encode(out)
}

// List pending join requests for a group (group owners only)
func (h *GroupsHandler) ListJoinRequests(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	gid := chi.URLParam(r, "id")

	// Check if user is group owner
	var ownerID string
	err := h.DB.QueryRow("SELECT owner_user_id FROM groups WHERE id = ?", gid).Scan(&ownerID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	if ownerID != sess.UserID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Get pending join requests
	rows, err := h.DB.Query(`
		SELECT gr.id, gr.user_id, gr.created_at,
		       u.first_name, u.last_name, u.email
		FROM group_requests gr
		JOIN users u ON u.id = gr.user_id
		WHERE gr.group_id = ? AND gr.status = 'pending'
		ORDER BY gr.created_at ASC
	`, gid)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type joinRequest struct {
		ID        string `json:"id"`
		UserID    string `json:"user_id"`
		UserName  string `json:"user_name"`
		UserEmail string `json:"user_email"`
		CreatedAt string `json:"created_at"`
	}
	var out []joinRequest
	for rows.Next() {
		var req joinRequest
		var firstName, lastName string
		_ = rows.Scan(&req.ID, &req.UserID, &req.CreatedAt, &firstName, &lastName, &req.UserEmail)
		req.UserName = firstName + " " + lastName
		out = append(out, req)
	}
	_ = json.NewEncoder(w).Encode(out)
}

// Accept or decline a join request (group owners only)
func (h *GroupsHandler) HandleJoinRequest(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	gid := chi.URLParam(r, "id")
	requestID := chi.URLParam(r, "requestId")
	action := chi.URLParam(r, "action") // "accept" or "decline"

	if action != "accept" && action != "decline" {
		http.Error(w, "invalid action", http.StatusBadRequest)
		return
	}

	// Check if user is group owner
	var ownerID string
	err := h.DB.QueryRow("SELECT owner_user_id FROM groups WHERE id = ?", gid).Scan(&ownerID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	if ownerID != sess.UserID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Get the join request
	var userID string
	var status string
	err = h.DB.QueryRow("SELECT user_id, status FROM group_requests WHERE id = ? AND group_id = ?", requestID, gid).Scan(&userID, &status)
	if err != nil {
		http.Error(w, "join request not found", http.StatusNotFound)
		return
	}

	if status != "pending" {
		http.Error(w, "join request already processed", http.StatusConflict)
		return
	}

	// Update the join request status
	newStatus := "accepted"
	if action == "decline" {
		newStatus = "declined"
	}

	_, err = h.DB.Exec("UPDATE group_requests SET status = ? WHERE id = ?", newStatus, requestID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// If accepted, add user to group
	if action == "accept" {
		_, err = h.DB.Exec("INSERT OR IGNORE INTO group_members(group_id, user_id, role) VALUES(?,?, 'member')", gid, userID)
		if err != nil {
			http.Error(w, "failed to add user to group", http.StatusInternalServerError)
			return
		}

		// Create notification for join acceptance
		if h.NotificationService != nil {
			// Get group title and actor name
			var groupTitle, actorName string
			_ = h.DB.QueryRow("SELECT title FROM groups WHERE id = ?", gid).Scan(&groupTitle)
			_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&actorName)
			if actorName == "" {
				actorName = "Group Owner"
			}

			message := actorName + " accepted your request to join " + groupTitle
			h.NotificationService.CreateFollowNotification(sess.UserID, userID, "group_join_accepted", message)
		}
	} else {
		// Create notification for join decline
		if h.NotificationService != nil {
			// Get group title and actor name
			var groupTitle, actorName string
			_ = h.DB.QueryRow("SELECT title FROM groups WHERE id = ?", gid).Scan(&groupTitle)
			_ = h.DB.QueryRow("SELECT first_name || ' ' || last_name FROM users WHERE id = ?", sess.UserID).Scan(&actorName)
			if actorName == "" {
				actorName = "Group Owner"
			}

			message := actorName + " declined your request to join " + groupTitle
			h.NotificationService.CreateFollowNotification(sess.UserID, userID, "group_join_declined", message)
		}
	}

	_ = json.NewEncoder(w).Encode(map[string]string{"status": newStatus})
}

// CancelJoinRequest allows users to cancel their own pending join requests
func (h *GroupsHandler) CancelJoinRequest(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	gid := chi.URLParam(r, "id")

	// Check if user has a pending request for this group
	var requestID string
	err := h.DB.QueryRow("SELECT id FROM group_requests WHERE group_id = ? AND user_id = ? AND status = 'pending'", gid, sess.UserID).Scan(&requestID)
	if err != nil {
		http.Error(w, "no pending request found", http.StatusNotFound)
		return
	}

	// Delete the request
	_, err = h.DB.Exec("DELETE FROM group_requests WHERE id = ?", requestID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Join request cancelled successfully"})
}
