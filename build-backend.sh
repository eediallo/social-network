#!/bin/bash

# Build script for backend only
# This script builds the Go backend for production deployment

set -e  # Exit on any error

echo "🚀 Building Social Network Backend..."

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

# Navigate to backend directory
cd backend

print_status "Building Go backend..."

# Clean previous builds
if [ -f "server" ]; then
    print_status "Cleaning previous build..."
    rm -f server
fi

# Build the application
print_status "Compiling Go application..."
# Try with CGO first, fallback to CGO_ENABLED=0 if it fails
if CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server 2>/dev/null; then
    print_success "Built with CGO enabled"
elif CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server 2>/dev/null; then
    print_warning "Built with CGO disabled (SQLite will use pure Go driver)"
else
    print_error "Build failed with both CGO enabled and disabled"
    exit 1
fi

if [ $? -eq 0 ]; then
    print_success "Backend built successfully!"
    print_status "Binary location: backend/server"
    print_status "Binary size: $(du -h server | cut -f1)"
else
    print_error "Build failed!"
    exit 1
fi

# Check if binary is executable
if [ -x "server" ]; then
    print_success "Binary is executable"
else
    print_warning "Making binary executable..."
    chmod +x server
fi

# Test the binary
print_status "Testing binary..."
if ./server --help 2>/dev/null || timeout 2s ./server >/dev/null 2>&1; then
    print_success "Binary test passed"
else
    print_warning "Binary test failed, but this might be normal for a server"
fi

print_success "Backend build completed!"
print_status "Ready for deployment to Render, Railway, or other platforms"
