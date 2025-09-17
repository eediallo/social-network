package main

import (
	"database/sql"
	"log"

	"social-network/backend/internal/services"
	ws "social-network/backend/internal/websocket"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	log.Println("Testing notification service...")

	// Initialize database
	db, err := sql.Open("sqlite3", "data/app.db")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize WebSocket hub
	wsHub := ws.NewHub()
	go wsHub.Run()

	// Initialize notification service
	notificationService := services.NewNotificationService(db, wsHub)

	// Test creating a group message notification
	err = notificationService.CreateGroupActivityNotification(
		"cd7c0ee4-7094-4bd1-aa99-b83755dda117", // actor (Halimatou)
		"0f0f826a-8f31-4333-92a9-a561c7fa1151", // group
		"group_message",
		"Test group message notification",
	)

	if err != nil {
		log.Printf("Error creating notification: %v", err)
	} else {
		log.Println("Notification created successfully!")
	}
}
