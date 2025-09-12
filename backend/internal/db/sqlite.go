package db

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

// OpenSQLite opens a SQLite database file from env DB_PATH or default path.
func OpenSQLite() (*sql.DB, error) {
	path := os.Getenv("DB_PATH")
	if path == "" {
		path = "./data/app.db"
	}
	if err := os.MkdirAll("./data", 0o755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	db, err := sql.Open("sqlite3", path+"?_foreign_keys=on")
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}
