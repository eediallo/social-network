DB_PATH := /Users/cyf/Desktop/01founders/social-network/backend/data/app.db

.PHONY: run build tidy

run:
	DB_PATH="$(DB_PATH)" go run ./cmd/server

build:
	go build ./cmd/server

tidy:
	go mod tidy


