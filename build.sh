#!/bin/bash

# Build script for social network application
echo "Building Social Network Application..."

# Build backend
echo "Building backend..."
cd backend
docker build -t social-network-backend .
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
docker build -t social-network-frontend .
cd ..

echo "Build completed successfully!"
echo "Run 'docker-compose up -d' to start the application"
