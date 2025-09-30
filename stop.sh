#!/bin/bash

# Stop Social Network Application

echo "Stopping Social Network Application"
echo "===================================="

# Stop containers
docker compose down

echo "Application stopped successfully"
echo ""
echo "To start again, run: ./deploy.sh"