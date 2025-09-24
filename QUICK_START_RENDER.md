# 🚀 Quick Start: Deploy to Render

## Option 1: Using Render's Native Go Support (Recommended)

### 1. Prepare Your Code
```bash
# Make sure you're in the project root
cd /path/to/social-network

# Run the deployment script
./deploy-render.sh
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:

**Basic Settings:**
- **Name**: `social-network-backend`
- **Environment**: `Go`
- **Root Directory**: `backend`
- **Branch**: `main`

**Build & Deploy:**
- **Build Command**: 
  ```bash
  go mod download
  CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server
  ```
- **Start Command**: `./server`

**Environment Variables:**
```
PORT=10000
HOST=0.0.0.0
DB_PATH=/opt/render/project/src/backend/data/app.db
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_ENVIRONMENT=production
CORS_ORIGINS=https://your-frontend-domain.onrender.com
```

## Option 2: Using Docker

### 1. Build with Docker
```bash
./build-backend-docker.sh
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:

**Basic Settings:**
- **Name**: `social-network-backend`
- **Environment**: `Docker`
- **Dockerfile Path**: `backend/Dockerfile.render`
- **Branch**: `main`

**Environment Variables:**
```
PORT=10000
HOST=0.0.0.0
DB_PATH=/app/data/app.db
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_ENVIRONMENT=production
CORS_ORIGINS=https://your-frontend-domain.onrender.com
```

## ✅ Verify Deployment

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app-name.onrender.com/health

# API health check
curl https://your-app-name.onrender.com/api/health
```

Both should return `ok`.

## 🔧 Troubleshooting

### Common Issues:

1. **Build Fails**
   - Make sure you're using the correct build command
   - Check that CGO is enabled

2. **Database Issues**
   - Verify `DB_PATH` environment variable
   - Check that the data directory exists

3. **CORS Errors**
   - Update `CORS_ORIGINS` with your frontend URL
   - Make sure the frontend URL is correct

4. **Health Check Fails**
   - Ensure `/health` endpoint returns 200
   - Check server logs in Render dashboard

## 📊 Monitoring

- **Logs**: Available in Render dashboard
- **Metrics**: CPU, Memory, Response time
- **Uptime**: Automatic monitoring

## 💰 Pricing

- **Free Tier**: 750 hours/month (sleeps after 15 min inactivity)
- **Starter**: $7/month (always on)
- **Professional**: $25/month (better performance)

---

## 🎉 Success!

Your backend will be available at:
`https://your-app-name.onrender.com`

Update your frontend to use this new backend URL!
