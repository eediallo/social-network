package websocket

import (
	"log"
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// User-specific clients (for direct messages)
	userClients map[string][]*Client

	// Group-specific clients (for group messages)
	groupClients map[string][]*Client

	// Mutex for thread-safe access
	mutex sync.RWMutex
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		broadcast:    make(chan []byte),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		userClients:  make(map[string][]*Client),
		groupClients: make(map[string][]*Client),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true

			// Add to user-specific clients
			if client.userID != "" {
				h.userClients[client.userID] = append(h.userClients[client.userID], client)
			}

			// Add to group-specific clients if in a group
			if client.groupID != "" {
				h.groupClients[client.groupID] = append(h.groupClients[client.groupID], client)
			}
			h.mutex.Unlock()

			log.Printf("Client registered. User: %s, Group: %s", client.userID, client.groupID)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)

				// Remove from user-specific clients
				if client.userID != "" {
					clients := h.userClients[client.userID]
					for i, c := range clients {
						if c == client {
							h.userClients[client.userID] = append(clients[:i], clients[i+1:]...)
							break
						}
					}
					if len(h.userClients[client.userID]) == 0 {
						delete(h.userClients, client.userID)
					}
				}

				// Remove from group-specific clients
				if client.groupID != "" {
					clients := h.groupClients[client.groupID]
					for i, c := range clients {
						if c == client {
							h.groupClients[client.groupID] = append(clients[:i], clients[i+1:]...)
							break
						}
					}
					if len(h.groupClients[client.groupID]) == 0 {
						delete(h.groupClients, client.groupID)
					}
				}
			}
			h.mutex.Unlock()

			log.Printf("Client unregistered. User: %s, Group: %s", client.userID, client.groupID)

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// BroadcastToUser sends a message to all clients of a specific user
func (h *Hub) BroadcastToUser(userID string, message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if clients, ok := h.userClients[userID]; ok {
		for _, client := range clients {
			select {
			case client.send <- message:
			default:
				// Client is not ready, skip
			}
		}
	}
}

// BroadcastToGroup sends a message to all clients in a specific group
func (h *Hub) BroadcastToGroup(groupID string, message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if clients, ok := h.groupClients[groupID]; ok {
		for _, client := range clients {
			select {
			case client.send <- message:
			default:
				// Client is not ready, skip
			}
		}
	}
}

// GetUserClients returns all clients for a specific user
func (h *Hub) GetUserClients(userID string) []*Client {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if clients, ok := h.userClients[userID]; ok {
		return clients
	}
	return []*Client{}
}

// GetGroupClients returns all clients in a specific group
func (h *Hub) GetGroupClients(groupID string) []*Client {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if clients, ok := h.groupClients[groupID]; ok {
		return clients
	}
	return []*Client{}
}
