#!/bin/bash

# Build script for backend using Docker
# This ensures consistent builds across different platforms

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "backend/go.mod" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "🐳 Building backend using Docker..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Build using Docker
print_status "Building Go backend with Docker..."
cd backend

# Clean previous builds
if [ -f "server" ]; then
    print_status "Cleaning previous build..."
    rm -f server
fi

# Build using Docker
docker run --rm \
    -v "$(pwd)":/app \
    -w /app \
    golang:1.23-alpine \
    sh -c "apk add --no-cache gcc musl-dev && CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server"

if [ $? -eq 0 ]; then
    print_success "Backend built successfully using Docker!"
    print_status "Binary location: backend/server"
    print_status "Binary size: $(du -h server | cut -f1)"
else
    print_error "Docker build failed!"
    exit 1
fi

# Check if binary is executable
if [ -x "server" ]; then
    print_success "Binary is executable"
else
    print_warning "Making binary executable..."
    chmod +x server
fi

print_success "🎉 Backend build completed!"
print_status "Ready for deployment to Render, Railway, or other platforms"
print_status "Binary is built for Linux and ready for production deployment"
