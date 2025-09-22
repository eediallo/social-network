#!/bin/bash

# Deploy script for social network application
echo "Deploying Social Network Application..."

# Stop existing containers
echo "Stopping existing containers..."
docker compose down

# Sync local database to Docker volume (if local database exists)
if [ -f "backend/data/app.db" ]; then
    echo "Syncing local database to Docker volume..."
    docker run --rm -v social-network_backend-data:/data -v $(pwd)/backend/data:/source alpine cp /source/app.db /data/app.db
    echo "Database synced successfully!"
else
    echo "No local database found, using existing Docker volume..."
fi

# Remove old images (optional)
echo "Removing old images..."
docker image prune -f

# Build and start services
echo "Building and starting services..."
docker compose up --build -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check if services are running
echo "Checking service status..."
docker compose ps

echo "Deployment completed!"
echo "Application is available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8080"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
