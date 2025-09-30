#!/bin/bash

echo "Building Docker images for social network application..."

# Build backend
echo "Building backend..."
docker build -t social-network-backend ./backend

# Build frontend
echo "Building frontend..."
docker build -t social-network-frontend ./frontend

echo "Build completed!"
echo "Run 'docker compose up -d' to start the application"