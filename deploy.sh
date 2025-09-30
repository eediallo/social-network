#!/bin/bash

# Social Network Deploy Script for Audit
# This script builds and deploys the application with all audit requirements

set -e

echo "Deploying Social Network Application for Audit"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is running
check_docker() {
print_status "Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
print_error "Docker is not running. Please start Docker Desktop and try again."
exit 1
fi
print_success "Docker is running"
}

# Clean up existing containers and images
cleanup() {
print_status "Cleaning up existing containers and images..."

# Stop and remove containers
docker compose down --remove-orphans 2>/dev/null || true

# Remove old images
docker rmi social-network-backend social-network-frontend 2>/dev/null || true

print_success "Cleanup completed"
}

# Build Docker images
build_images() {
print_status "Building Docker images..."

# Build backend
print_status "Building backend image..."
if docker build -t social-network-backend ./backend; then
print_success "Backend image built successfully"
else
print_error "Failed to build backend image"
exit 1
fi

# Build frontend
print_status "Building frontend image..."
if docker build -t social-network-frontend ./frontend; then
print_success "Frontend image built successfully"
else
print_error "Failed to build frontend image"
exit 1
fi
}

# Start containers
start_containers() {
print_status "Starting containers..."

if docker compose up -d; then
print_success "Containers started successfully"
else
print_error "Failed to start containers"
exit 1
fi
}

# Wait for services to be ready
wait_for_services() {
print_status "Waiting for services to be ready..."

# Wait for backend
print_status "Waiting for backend to be ready..."
for i in {1..30}; do
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
print_success "Backend is ready"
break
fi
if [ $i -eq 30 ]; then
print_error "Backend failed to start within 30 seconds"
print_status "Backend logs:"
docker logs social-network-backend-1 --tail 20
exit 1
fi
sleep 1
done

# Wait for frontend
print_status "Waiting for frontend to be ready..."
for i in {1..30}; do
if curl -s http://localhost:3000 > /dev/null 2>&1; then
print_success "Frontend is ready"
break
fi
if [ $i -eq 30 ]; then
print_error "Frontend failed to start within 30 seconds"
print_status "Frontend logs:"
docker logs social-network-frontend-1 --tail 20
exit 1
fi
sleep 1
done
}

# Verify deployment
verify_deployment() {
print_status "Verifying deployment..."

# Check containers are running
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "social-network"; then
print_success "Containers are running"
else
print_error "Containers are not running"
exit 1
fi

# Check container sizes
BACKEND_SIZE=$(docker images social-network-backend --format "{{.Size}}")
FRONTEND_SIZE=$(docker images social-network-frontend --format "{{.Size}}")

if [[ "$BACKEND_SIZE" != "0B" && "$FRONTEND_SIZE" != "0B" ]]; then
print_success "Containers have non-zero sizes (Backend: $BACKEND_SIZE, Frontend: $FRONTEND_SIZE)"
else
print_error "Containers have zero sizes"
exit 1
fi

# Test API endpoints
if curl -s http://localhost:8080/health > /dev/null; then
print_success "Backend API is accessible"
else
print_error "Backend API is not accessible"
exit 1
fi

if curl -s http://localhost:3000/api/health > /dev/null; then
print_success "Frontend API proxy is working"
else
print_error "Frontend API proxy is not working"
exit 1
fi

# Test WebSocket
if curl -s -I http://localhost:3000/ws | grep -q "401 Unauthorized"; then
print_success "WebSocket endpoint is accessible"
else
print_warning "WebSocket endpoint may not be working properly"
fi

# Test frontend accessibility
if curl -s http://localhost:3000 | grep -q "Vite + React"; then
print_success "Frontend application is accessible"
else
print_error "Frontend application is not accessible"
exit 1
fi
}

# Show deployment info
show_info() {
echo ""
echo " Deployment Successful!"
echo "========================"
echo ""
echo " Access Points:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8080"
echo "  Health Check: http://localhost:8080/health"
echo ""
echo " Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo " To run audit tests:"
echo "  ./audit_test.sh"
echo ""
echo " To stop the application:"
echo "  docker compose down"
echo ""
echo " Manual Testing:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Register a new user"
echo "  3. Test all features (posts, groups, chat, notifications)"
echo ""
}

# Main execution
main() {
echo "Starting deployment process..."
echo ""

check_docker
cleanup
build_images
start_containers
wait_for_services
verify_deployment
show_info

}

# Run main function
main "$@"
