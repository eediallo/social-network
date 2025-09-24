#!/bin/bash

# Simple Render deployment script
# This script prepares your code for Render deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                🚀 RENDER DEPLOYMENT PREP                     ║"
    echo "║                                                              ║"
    echo "║  This script prepares your code for Render deployment       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if we're in the right directory
if [ ! -f "backend/go.mod" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_header

# Check if .env file exists and has Cloudinary credentials
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating template..."
    cat > .env << EOF
# Database
DB_PATH=./data/app.db

# Cloudinary Configuration (REPLACE WITH YOUR VALUES)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_ENVIRONMENT=production

# Server
PORT=10000
HOST=0.0.0.0
EOF
    print_warning "Please update .env file with your Cloudinary credentials!"
    print_warning "You can get them from https://cloudinary.com/console"
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_warning "Git repository not found. Initializing..."
    git init
    git add .
    git commit -m "Initial commit for Render deployment"
fi

# Check if remote origin exists
if ! git remote get-url origin >/dev/null 2>&1; then
    print_warning "No GitHub remote found. Please add your GitHub repository:"
    echo "git remote add origin https://github.com/yourusername/your-repo.git"
    echo "git push -u origin main"
    echo ""
    print_status "After adding the remote, run this script again."
    exit 1
fi

# Commit and push changes
print_status "Preparing code for deployment..."
git add .
git commit -m "Prepare for Render deployment - $(date)" || true

print_status "Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    print_success "Code pushed to GitHub successfully!"
else
    print_error "Failed to push to GitHub!"
    exit 1
fi

print_success "🎉 Ready for Render deployment!"
echo ""
print_status "Next steps:"
echo "1. Go to https://render.com"
echo "2. Sign up/Login with GitHub"
echo "3. Click 'New +' → 'Web Service'"
echo "4. Connect your GitHub repository"
echo "5. Use these settings:"
echo ""
echo "   📋 BASIC SETTINGS:"
echo "   • Name: social-network-backend"
echo "   • Environment: Go"
echo "   • Root Directory: backend"
echo "   • Branch: main"
echo ""
echo "   🔨 BUILD & DEPLOY:"
echo "   • Build Command:"
echo "     go mod download"
echo "     CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server"
echo "   • Start Command: ./server"
echo ""
echo "   🌍 ENVIRONMENT VARIABLES:"
echo "   • PORT = 10000"
echo "   • HOST = 0.0.0.0"
echo "   • DB_PATH = /opt/render/project/src/backend/data/app.db"
echo "   • CLOUDINARY_CLOUD_NAME = your_cloud_name"
echo "   • CLOUDINARY_API_KEY = your_api_key"
echo "   • CLOUDINARY_API_SECRET = your_api_secret"
echo "   • CLOUDINARY_ENVIRONMENT = production"
echo "   • CORS_ORIGINS = https://your-frontend-domain.onrender.com"
echo ""
echo "   ⚙️  ADVANCED SETTINGS:"
echo "   • Health Check Path: /health"
echo "   • Auto-Deploy: Yes"
echo ""
print_status "📚 For detailed instructions, see:"
echo "   • RENDER_DEPLOYMENT.md"
echo "   • QUICK_START_RENDER.md"
echo ""
print_success "Your backend will be available at: https://your-app-name.onrender.com"
