#!/bin/bash

# Database sync script for social network application
echo "Database Sync Utility"
echo "===================="
echo ""

# Function to sync from local to Docker
sync_to_docker() {
    if [ -f "backend/data/app.db" ]; then
        echo "Syncing local database to Docker volume..."
        docker run --rm -v social-network_backend-data:/data -v $(pwd)/backend/data:/source alpine cp /source/app.db /data/app.db
        echo "✅ Local database synced to Docker volume!"
    else
        echo "❌ No local database found at backend/data/app.db"
        exit 1
    fi
}

# Function to sync from Docker to local
sync_to_local() {
    echo "Syncing Docker volume database to local..."
    docker run --rm -v social-network_backend-data:/data -v $(pwd)/backend/data:/target alpine cp /data/app.db /target/app.db
    echo "✅ Docker volume database synced to local!"
}

# Function to show database stats
show_stats() {
    echo "Database Statistics:"
    echo "==================="
    
    if [ -f "backend/data/app.db" ]; then
        local_users=$(sqlite3 backend/data/app.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
        echo "Local database: $local_users users"
    else
        echo "Local database: Not found"
    fi
    
    docker_users=$(docker run --rm -v social-network_backend-data:/data social-network-backend sqlite3 /data/app.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    echo "Docker volume: $docker_users users"
}

# Main script logic
case "${1:-help}" in
    "to-docker")
        sync_to_docker
        ;;
    "to-local")
        sync_to_local
        ;;
    "stats")
        show_stats
        ;;
    "help"|*)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  to-docker  - Sync local database to Docker volume"
        echo "  to-local   - Sync Docker volume to local database"
        echo "  stats      - Show database statistics"
        echo "  help       - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 to-docker    # Copy local DB to Docker (before deploy.sh)"
        echo "  $0 to-local     # Copy Docker DB to local (after deploy.sh)"
        echo "  $0 stats        # Check user counts in both databases"
        ;;
esac
