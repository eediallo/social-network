package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"social-network/backend/internal/auth"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GroupsHandler struct{ DB *sql.DB }

type createGroupReq struct{ Title, Description string }

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
	gid := uuid.NewString()
	if _, err := h.DB.Exec("INSERT INTO groups(id, owner_user_id, title, description) VALUES(?,?,?,?)", gid, sess.UserID, body.Title, body.Description); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	// owner is a member
	_, _ = h.DB.Exec("INSERT OR IGNORE INTO group_members(group_id, user_id, role) VALUES(?,?,'owner')", gid, sess.UserID)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": gid})
}

func (h *GroupsHandler) ListGroups(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT g.id, g.owner_user_id, g.title, g.description, g.created_at,
		       COUNT(gm.user_id) as member_count
		FROM groups g
		LEFT JOIN group_members gm ON gm.group_id = g.id
		GROUP BY g.id, g.owner_user_id, g.title, g.description, g.created_at
		ORDER BY g.created_at DESC LIMIT 100
	`)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type g struct {
		ID, OwnerID, Title, Description, CreatedAt string
		MemberCount                                int `json:"member_count"`
	}
	var out []g
	for rows.Next() {
		var x g
		_ = rows.Scan(&x.ID, &x.OwnerID, &x.Title, &x.Description, &x.CreatedAt, &x.MemberCount)
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
	_, _ = h.DB.Exec("INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id) VALUES(?,?,?,?,?)", uuid.NewString(), body.UserID, "group_invite", sess.UserID, iid)
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
	rid := uuid.NewString()
	if _, err := h.DB.Exec("INSERT INTO group_requests(id, group_id, user_id, status) VALUES(?,?,?, 'pending')", rid, gid, sess.UserID); err != nil {
		http.Error(w, "conflict", http.StatusConflict)
		return
	}
	// notify group owner
	var owner string
	_ = h.DB.QueryRow("SELECT owner_user_id FROM groups WHERE id = ?", gid).Scan(&owner)
	if owner != "" {
		_, _ = h.DB.Exec("INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id) VALUES(?,?,?,?,?)", uuid.NewString(), owner, "group_join_request", sess.UserID, rid)
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"id": rid, "status": "pending"})
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

type createEventReq struct{ Title, Description, Datetime string }

func (h *GroupsHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	// must be member
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var body createEventReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" || body.Datetime == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	eid := uuid.NewString()
	if _, err := h.DB.Exec("INSERT INTO events(id, group_id, title, description, datetime) VALUES(?,?,?,?,?)", eid, gid, body.Title, body.Description, body.Datetime); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	// notify all group members about new event
	rows, err := h.DB.Query("SELECT user_id FROM group_members WHERE group_id = ?", gid)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var uid string
			if err := rows.Scan(&uid); err == nil {
				_, _ = h.DB.Exec("INSERT INTO notifications(id, user_id, type, actor_user_id, subject_id) VALUES(?,?,?,?,?)", uuid.NewString(), uid, "group_event_created", sess.UserID, eid)
			}
		}
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"id": eid})
}

type rsvpReq struct {
	Status string `json:"status"`
}

func (h *GroupsHandler) RespondEvent(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	eid := chi.URLParam(r, "eventID")
	// member check
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var body rsvpReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || (body.Status != "going" && body.Status != "not_going") {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := h.DB.Exec("INSERT INTO event_responses(event_id, user_id, status) VALUES(?,?,?) ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status, responded_at=CURRENT_TIMESTAMP", eid, sess.UserID, body.Status)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": body.Status})
}

// List all events for a group
func (h *GroupsHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	// member check
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	rows, err := h.DB.Query("SELECT id, title, description, datetime FROM events WHERE group_id = ? ORDER BY datetime ASC", gid)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type event struct {
		ID          string `json:"id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Datetime    string `json:"datetime"`
	}
	var out []event
	for rows.Next() {
		var e event
		_ = rows.Scan(&e.ID, &e.Title, &e.Description, &e.Datetime)
		out = append(out, e)
	}
	_ = json.NewEncoder(w).Encode(out)
}

// List all responses for a given event
func (h *GroupsHandler) ListEventResponses(w http.ResponseWriter, r *http.Request) {
	sess, ok := auth.SessionFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	gid := chi.URLParam(r, "id")
	eid := chi.URLParam(r, "eventID")
	// member check
	var cnt int
	_ = h.DB.QueryRow("SELECT COUNT(1) FROM group_members WHERE group_id = ? AND user_id = ?", gid, sess.UserID).Scan(&cnt)
	if cnt == 0 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	rows, err := h.DB.Query("SELECT user_id, status, responded_at FROM event_responses WHERE event_id = ? ORDER BY responded_at ASC", eid)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type response struct {
		UserID      string `json:"user_id"`
		Status      string `json:"status"`
		RespondedAt string `json:"responded_at"`
	}
	var out []response
	for rows.Next() {
		var r response
		_ = rows.Scan(&r.UserID, &r.Status, &r.RespondedAt)
		out = append(out, r)
	}
	_ = json.NewEncoder(w).Encode(out)
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
		SELECT id, first_name, last_name, email
		FROM users 
		WHERE id != ? AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
		ORDER BY first_name, last_name
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
	}
	var out []user
	for rows.Next() {
		var u user
		_ = rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Email)
		out = append(out, u)
	}
	_ = json.NewEncoder(w).Encode(out)
}
