#!/bin/bash

# Coolify-compatible deploy script for social network application
echo "Deploying Social Network Application on Coolify..."

# Set error handling
set -e

# Function to check if we're running in Coolify
is_coolify() {
    [ -n "$COOLIFY" ] || [ -n "$COOLIFY_APP_ID" ] || [ -n "$COOLIFY_DOMAIN" ]
}

# Function to check if we're running in Docker
is_docker() {
    [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]
}

# Database initialization (only if needed)
init_database() {
    echo "Initializing database..."
    
    # Check if database exists
    if [ ! -f "/app/data/app.db" ]; then
        echo "Creating new database..."
        mkdir -p /app/data
        # The Go application will create the database and run migrations on startup
    else
        echo "Database already exists, skipping initialization..."
    fi
}

# Environment validation
validate_environment() {
    echo "Validating environment variables..."
    
    # Check required environment variables
    if [ -z "$CLOUDINARY_CLOUD_NAME" ]; then
        echo "Warning: CLOUDINARY_CLOUD_NAME not set - image uploads will fail"
    fi
    
    if [ -z "$CLOUDINARY_API_KEY" ]; then
        echo "Warning: CLOUDINARY_API_KEY not set - image uploads will fail"
    fi
    
    if [ -z "$CLOUDINARY_API_SECRET" ]; then
        echo "Warning: CLOUDINARY_API_SECRET not set - image uploads will fail"
    fi
    
    echo "Environment validation completed."
}

# Health check function
health_check() {
    echo "Performing health check..."
    
    # Wait for backend to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
            echo "Backend health check passed!"
            break
        fi
        
        echo "Health check attempt $attempt/$max_attempts - waiting for backend..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo "Error: Backend health check failed after $max_attempts attempts"
        exit 1
    fi
    
    # Check if frontend is serving
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        echo "Frontend health check passed!"
    else
        echo "Warning: Frontend health check failed - this might be normal during startup"
    fi
}

# Main deployment logic
main() {
    echo "Starting deployment process..."
    
    # Validate environment
    validate_environment
    
    # Initialize database if needed
    init_database
    
    # Create necessary directories
    echo "Creating necessary directories..."
    mkdir -p /app/data /app/uploads
    
    # Set proper permissions
    chmod 755 /app/data /app/uploads
    
    # Start the application
    echo "Starting application services..."
    
    if is_coolify || is_docker; then
        echo "Running in Coolify/Docker environment"
        # In Coolify, the application is started by the container
        # This script is run as a pre-start hook or initialization script
        echo "Application initialization completed!"
    else
        echo "Running in local environment"
        # For local development, start the services
        docker compose up --build -d
        
        # Wait for services to be ready
        echo "Waiting for services to start..."
        sleep 10
        
        # Perform health check
        health_check
        
        # Show status
        echo "Checking service status..."
        docker compose ps
    fi
    
    echo "Deployment completed successfully!"
    
    if is_coolify; then
        echo "Application is available at your Coolify domain"
    else
        echo "Application is available at:"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend API: http://localhost:8080"
    fi
}

# Run main function
main "$@"
