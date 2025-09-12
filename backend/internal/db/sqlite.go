package db

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

// OpenSQLite opens a SQLite database file from env DB_PATH or default path.
func OpenSQLite() (*sql.DB, error) {
	path := os.Getenv("DB_PATH")
	if path == "" {
		path = "./data/app.db"
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
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

// ApplyMigrations runs .sql files in order from the given directory path.
// It expects paired up/down files but applies only .up.sql on startup.
func ApplyMigrations(db *sql.DB, dir string) error {
	if err := ensureMigrationsTable(db); err != nil {
		return err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	var ups []string
	for _, e := range entries {
		name := e.Name()
		if strings.HasSuffix(name, ".up.sql") {
			ups = append(ups, name)
		}
	}
	sort.Strings(ups)
	for _, fname := range ups {
		version := strings.TrimSuffix(fname, ".up.sql")
		applied, err := isApplied(db, version)
		if err != nil {
			return err
		}
		if applied {
			continue
		}
		path := filepath.Join(dir, fname)
		if err := applyFile(db, path); err != nil {
			return fmt.Errorf("apply %s: %w", fname, err)
		}
		if err := markApplied(db, version); err != nil {
			return err
		}
	}
	return nil
}

func ensureMigrationsTable(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	return err
}

func isApplied(db *sql.DB, version string) (bool, error) {
	var count int
	if err := db.QueryRow("SELECT COUNT(1) FROM schema_migrations WHERE version = ?", version).Scan(&count); err != nil {
		return false, err
	}
	return count > 0, nil
}

func markApplied(db *sql.DB, version string) error {
	_, err := db.Exec("INSERT INTO schema_migrations(version) VALUES (?)", version)
	return err
}

func applyFile(db *sql.DB, path string) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	sqlText := string(b)
	if strings.TrimSpace(sqlText) == "" {
		return nil
	}
	_, err = db.Exec(sqlText)
	return err
}

var ErrNoMigrations = errors.New("no migrations found")
