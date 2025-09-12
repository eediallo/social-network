package websocket

import (
	"sync"
)

type Client struct {
	UserID string
	Send   chan []byte
}

type Hub struct {
	mu        sync.RWMutex
	users     map[string]map[*Client]struct{}
	groupSubs map[string]map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{users: make(map[string]map[*Client]struct{}), groupSubs: make(map[string]map[*Client]struct{})}
}

func (h *Hub) Register(userID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.users[userID] == nil {
		h.users[userID] = make(map[*Client]struct{})
	}
	h.users[userID][c] = struct{}{}
}

func (h *Hub) Unregister(userID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if m, ok := h.users[userID]; ok {
		delete(m, c)
		if len(m) == 0 {
			delete(h.users, userID)
		}
	}
	for gid, subs := range h.groupSubs {
		delete(subs, c)
		if len(subs) == 0 {
			delete(h.groupSubs, gid)
		}
	}
}

func (h *Hub) SubscribeGroup(groupID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.groupSubs[groupID] == nil {
		h.groupSubs[groupID] = make(map[*Client]struct{})
	}
	h.groupSubs[groupID][c] = struct{}{}
}

func (h *Hub) BroadcastToUser(userID string, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.users[userID] {
		select {
		case c.Send <- payload:
		default:
		}
	}
}

func (h *Hub) BroadcastToGroup(groupID string, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.groupSubs[groupID] {
		select {
		case c.Send <- payload:
		default:
		}
	}
}
