package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"social-network/backend/internal/db"
	customhttp "social-network/backend/internal/http"
)

func main() {
	// Open DB
	database, err := db.OpenSQLite()
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	// Apply migrations
	migrationsDir := filepath.Join("internal", "db", "migrations", "sqlite")
	if envDir := os.Getenv("MIGRATIONS_DIR"); envDir != "" {
		migrationsDir = envDir
	}
	if err := db.ApplyMigrations(database, migrationsDir); err != nil {
		log.Fatal(err)
	}

	h := customhttp.NewRouter()
	log.Println("server starting on :8080")
	if err := http.ListenAndServe(":8080", h); err != nil {
		log.Fatal(err)
	}
}
