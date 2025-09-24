# 🚀 Deploy Social Network Backend on Render

This guide will help you deploy the Go backend to Render.com.

## 📋 Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Cloudinary Account**: For image uploads (free tier available)

## 🔧 Step 1: Prepare Your Repository

### 1.1 Push Your Code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2 Update Environment Variables
Make sure your `.env` file has the correct Cloudinary credentials:
```bash
# Database
DB_PATH=./data/app.db

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_ENVIRONMENT=production

# Server
PORT=10000
HOST=0.0.0.0
```

## 🚀 Step 2: Deploy on Render

### 2.1 Create New Web Service

1. **Login to Render Dashboard**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub account
   - Select your social-network repository
   - Choose the main branch

3. **Configure Service Settings**

   **Basic Settings:**
   - **Name**: `social-network-backend`
   - **Environment**: `Go`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`

   **Build & Deploy:**
   - **Build Command**: 
     ```bash
     go mod download
     CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server
     ```
   - **Start Command**: `./server`

   **Advanced Settings:**
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`

### 2.2 Environment Variables

Add these environment variables in Render dashboard:

| Key | Value | Description |
|-----|-------|-------------|
| `PORT` | `10000` | Render's default port |
| `HOST` | `0.0.0.0` | Listen on all interfaces |
| `DB_PATH` | `/opt/render/project/src/backend/data/app.db` | Database path |
| `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | `your_api_key` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `your_api_secret` | Your Cloudinary API secret |
| `CLOUDINARY_ENVIRONMENT` | `production` | Cloudinary environment |
| `CORS_ORIGINS` | `https://your-frontend-domain.onrender.com` | Frontend URL for CORS |

### 2.3 Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install Go dependencies
   - Build your application
   - Deploy it

## 🔍 Step 3: Verify Deployment

### 3.1 Check Health Endpoint
```bash
curl https://your-backend-name.onrender.com/health
```
Should return: `ok`

### 3.2 Check API Endpoints
```bash
curl https://your-backend-name.onrender.com/api/health
```
Should return: `ok`

### 3.3 Test Database
The SQLite database will be created automatically on first run.

## 🎯 Step 4: Deploy Frontend (Optional)

If you want to deploy the frontend on Render too:

1. **Create another Web Service**
2. **Environment**: `Static Site`
3. **Build Command**: 
   ```bash
   cd frontend
   npm install
   npm run build
   ```
4. **Publish Directory**: `frontend/dist`
5. **Environment Variables**:
   - `REACT_APP_API_URL`: `https://your-backend-name.onrender.com`

## 🔧 Troubleshooting

### Common Issues:

1. **Build Fails - CGO Error**
   - Solution: Make sure `CGO_ENABLED=1` in build command

2. **Database Permission Error**
   - Solution: Check `DB_PATH` environment variable

3. **CORS Errors**
   - Solution: Update `CORS_ORIGINS` with your frontend URL

4. **Health Check Fails**
   - Solution: Ensure `/health` endpoint returns 200 status

### Check Logs:
- Go to your service dashboard
- Click "Logs" tab
- Look for error messages

## 📊 Monitoring

Render provides:
- **Uptime monitoring**
- **Performance metrics**
- **Log aggregation**
- **Automatic scaling**

## 💰 Pricing

- **Free Tier**: 750 hours/month
- **Starter Plan**: $7/month for always-on
- **Professional**: $25/month for better performance

## 🔄 Updates

To update your deployment:
1. Push changes to GitHub
2. Render automatically redeploys
3. Check logs for any issues

## 📞 Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Community**: [render.com/community](https://render.com/community)
- **Status**: [status.render.com](https://status.render.com)

---

## 🎉 Success!

Your backend should now be running at:
`https://your-backend-name.onrender.com`

Update your frontend's API URL to point to this new backend URL!
