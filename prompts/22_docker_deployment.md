### Prompt: Docker Deployment Setup

**Priority: HIGH** - Required for audit

**Current Status:**
- Basic Docker setup exists
- Need proper containerization
- Need deployment scripts
- Need production configuration

**Tasks:**
1. **Backend Docker:**
   - Optimize Go backend Dockerfile
   - Multi-stage build for smaller image
   - Proper dependency management
   - Environment variable configuration

2. **Frontend Docker:**
   - Optimize React/Vite Dockerfile
   - Production build optimization
   - Static file serving
   - Environment configuration

3. **Docker Compose:**
   - Complete docker-compose.yml
   - Service dependencies
   - Volume management
   - Network configuration
   - Environment variables

4. **Deployment Scripts:**
   - Build script for images
   - Deploy script for containers
   - Health check scripts
   - Cleanup scripts

5. **Production Configuration:**
   - Environment variables
   - Database persistence
   - Log management
   - Security considerations

**Requirements:**
- Two containers (backend and frontend)
- Non-zero container sizes
- Application accessible via browser
- Proper service communication
- Production-ready configuration

**Success Criteria:**
- `docker ps -a` shows two running containers
- Application accessible through browser
- Containers have proper sizes
- Services communicate correctly
- Deployment is production-ready
