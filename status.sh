#!/bin/bash

# Check Social Network Application Status

echo "Social Network Application Status"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running"
    exit 1
fi

echo "Docker is running"
echo ""

# Check containers
echo "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep social-network || echo "No containers running"

echo ""

# Check if services are accessible
echo "Service Status:"

# Backend health check
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "Backend API: http://localhost:8080 - OK"
else
    echo "Backend API: http://localhost:8080 - Not accessible"
fi

# Frontend check
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Frontend: http://localhost:3000 - OK"
else
    echo "Frontend: http://localhost:3000 - Not accessible"
fi

# API proxy check
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "API Proxy: http://localhost:3000/api - OK"
else
    echo "API Proxy: http://localhost:3000/api - Not accessible"
fi

# WebSocket check
if curl -s http://localhost:3000/ws | grep -q "unauthorized\|WebSocket"; then
    echo "WebSocket: ws://localhost:3000/ws - OK"
else
    echo "WebSocket: ws://localhost:3000/ws - Not accessible"
fi

echo ""

# Show container sizes
echo "Container Sizes:"
docker images social-network-backend social-network-frontend --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" 2>/dev/null || echo "Images not found"

echo ""

# Show logs if there are issues
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "Backend Logs (last 10 lines):"
    docker logs social-network-backend-1 --tail 10 2>/dev/null || echo "No logs available"
    echo ""
fi

if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Frontend Logs (last 10 lines):"
    docker logs social-network-frontend-1 --tail 10 2>/dev/null || echo "No logs available"
    echo ""
fi