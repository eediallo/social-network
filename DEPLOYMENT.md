# Social Network Deployment Guide

## Overview
This social network application is containerized using Docker and can be deployed using Docker Compose. The application consists of two main services:
- **Backend**: Go-based API server with SQLite database
- **Frontend**: React application served via Nginx

## Prerequisites
- Docker
- Docker Compose
- Git
- Cloudinary account (for image uploads)

## Cloudinary Setup (Required for Image Uploads)

1. **Create a Cloudinary account**: https://cloudinary.com/
2. **Get your credentials** from the Cloudinary dashboard
3. **Set environment variables** before deployment:

```bash
# Create a .env file in the project root with your actual Cloudinary credentials
cat > .env << EOF
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
EOF
```

**Important**: Replace the placeholder values with your actual Cloudinary credentials from your dashboard.

**Note**: Without Cloudinary configuration, image uploads will fail with 413 errors.

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd social-network
```

### 2. Deploy the Application
```bash
# Make scripts executable
chmod +x build.sh deploy.sh

# Deploy the application
./deploy.sh
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

## Database Synchronization

**Important**: The Docker deployment uses a separate database volume from your local development database. If you have registered users locally, they won't be available in the Docker deployment by default.

### Automatic Sync (Recommended)
The `deploy.sh` script automatically syncs your local database to the Docker volume if it exists.

### Manual Database Sync
Use the `sync-db.sh` utility for manual database synchronization:

```bash
# Show database statistics
./sync-db.sh stats

# Sync local database to Docker (before deployment)
./sync-db.sh to-docker

# Sync Docker database to local (after deployment)
./sync-db.sh to-local
```

### Troubleshooting Login Issues
If you get "invalid credentials" when logging in after deployment:

1. **Check if users exist in Docker volume**:
   ```bash
   ./sync-db.sh stats
   ```

2. **Sync your local database to Docker**:
   ```bash
   ./sync-db.sh to-docker
   ./deploy.sh
   ```

### Troubleshooting WebSocket Issues
If you get "WebSocket connection refused" or "NS_ERROR_WEBSOCKET_CONNECTION_REFUSED":

1. **Check backend logs**:
   ```bash
   docker compose logs backend | grep -i websocket
   ```

2. **Verify WebSocket endpoint**:
   ```bash
   curl -i http://localhost:8080/ws
   # Should return 401 Unauthorized (not 403 Forbidden)
   ```

3. **Restart backend if needed**:
   ```bash
   docker compose restart backend
   ```

The WebSocket connection requires authentication, so it will only work when you're logged in through the frontend.

### Troubleshooting Image Upload Issues
If you get "413 Request Entity Too Large" when uploading images:

1. **Check image file size**: The server now supports up to 10MB per image
2. **Verify backend is running**: 
   ```bash
   curl http://localhost:8080/health
   # Should return "ok"
   ```
3. **Restart backend if needed**:
   ```bash
   docker compose restart backend
   ```

### Troubleshooting Comment Count Errors
If you see "TypeError: can't access property 'length', P is null" in the browser console:

1. **This has been fixed** in the latest deployment
2. **Refresh the page** to load the updated frontend code
3. **Check browser console** - the error should no longer appear

The comment count loading now properly handles null responses from the API.

## Manual Deployment

### Using Docker Compose
```bash
# Build and start services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Using Individual Commands
```bash
# Build backend
cd backend
docker build -t social-network-backend .

# Build frontend
cd ../frontend
docker build -t social-network-frontend .

# Run with docker compose
cd ..
docker compose up -d
```

## Verification

### Check Container Status
```bash
docker ps -a
```
You should see two running containers:
- `social-network_backend_1`
- `social-network_frontend_1`

### Check Container Sizes
```bash
docker images | grep social-network
```
Both containers should have non-zero sizes.

### Test Application Access
1. Open http://localhost:3000 in your browser
2. You should see the social network landing page
3. Try registering a new user
4. Test the main features (posts, groups, chat, etc.)

## Configuration

### Environment Variables
The application uses the following environment variables:

**Backend:**
- `DB_PATH`: Path to SQLite database (default: `/app/data/app.db`)
- `PORT`: Backend port (default: `8080`)

**Frontend:**
- Configured via nginx proxy to backend

### Database Persistence
The SQLite database is persisted using Docker volumes:
- `backend-data`: Stores the SQLite database
- `backend-uploads`: Stores uploaded files

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the ports
   lsof -i :3000
   lsof -i :8080
   
   # Stop conflicting services or change ports in docker-compose.yml
   ```

2. **Database Issues**
   ```bash
   # Remove volumes and restart
   docker compose down -v
   docker compose up --build -d
   ```

3. **Build Failures**
   ```bash
   # Clean up and rebuild
   docker system prune -f
   docker compose build --no-cache
   ```

### Viewing Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Accessing Containers
```bash
# Backend container
docker compose exec backend sh

# Frontend container
docker compose exec frontend sh
```

## Production Considerations

### Security
- Change default ports in production
- Use environment variables for sensitive data
- Enable HTTPS with reverse proxy
- Regular security updates

### Performance
- Configure resource limits
- Use external database for production
- Enable caching
- Monitor resource usage

### Monitoring
- Set up health checks
- Monitor container logs
- Track resource usage
- Set up alerts

## Development

### Local Development
```bash
# Backend
cd backend
go run ./cmd/server

# Frontend
cd frontend
npm install
npm run dev
```

### Making Changes
1. Make your changes
2. Rebuild containers: `docker compose up --build -d`
3. Test the changes
4. Commit and push

## Cleanup

### Stop and Remove
```bash
# Stop services
docker compose down

# Remove volumes (WARNING: This will delete all data)
docker compose down -v

# Remove images
docker rmi social-network-backend social-network-frontend
```

## Support

For issues or questions:
1. Check the logs: `docker compose logs -f`
2. Verify container status: `docker ps -a`
3. Check the troubleshooting section above
4. Review the application logs in the containers
