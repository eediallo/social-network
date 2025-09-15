# Cloudinary Setup Guide

This guide will help you set up Cloudinary for image storage in the social network application.

## 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Verify your email address

## 2. Get Your Cloudinary Credentials

1. Log in to your Cloudinary dashboard
2. Go to the "Dashboard" section
3. Copy the following values:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## 3. Set Environment Variables

Create a `.env` file in the backend directory with the following variables:

```bash
# Database
DB_PATH=./data/app.db

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_ENVIRONMENT=production
```

Replace `your_cloud_name`, `your_api_key`, and `your_api_secret` with your actual Cloudinary credentials.

## 4. Run Database Migration

The application will automatically run the Cloudinary migration when you start the server. This adds new columns to store Cloudinary URLs.

## 5. Test the Integration

1. Start the backend server: `cd backend && go run ./cmd/server`
2. Start the frontend: `cd frontend && npm run dev`
3. Upload an image through the application
4. Check that the image is stored in Cloudinary and displayed correctly

## Features

- **Automatic Image Optimization**: Images are automatically optimized for web delivery
- **Responsive Images**: Different sizes are generated for different screen sizes
- **Format Optimization**: Images are converted to the best format (WebP, AVIF) for each browser
- **CDN Delivery**: Images are served from Cloudinary's global CDN for fast loading
- **Backup Storage**: Images are safely stored in the cloud with automatic backups

## Image Transformations

The application uses the following Cloudinary transformations:

### Avatars
- **Transformation**: `c_thumb,g_face,h_200,w_200/r_max/f_auto/q_auto`
- **Result**: 200x200px circular thumbnails with face detection

### Post Images
- **Transformation**: `c_limit,w_1200/f_auto/q_auto`
- **Result**: Maximum 1200px width, optimized format and quality

## Troubleshooting

### Images Not Uploading
1. Check that your Cloudinary credentials are correct
2. Verify that the environment variables are set
3. Check the backend logs for error messages

### Images Not Displaying
1. Check that the database migration ran successfully
2. Verify that the image URLs are being generated correctly
3. Check the browser console for any CORS errors

### Performance Issues
1. Ensure you're using the optimized image URLs
2. Check that images are being served from Cloudinary's CDN
3. Monitor your Cloudinary usage in the dashboard

## Migration from Local Storage

If you have existing images stored locally, they will continue to work as fallbacks. New images will be uploaded to Cloudinary. To migrate existing images:

1. Export your existing images
2. Re-upload them through the application
3. The new images will be stored in Cloudinary

## Cost Considerations

- **Free Tier**: 25GB storage, 25GB bandwidth per month
- **Paid Plans**: Start at $89/month for more storage and bandwidth
- **Pay-as-you-go**: Additional usage is charged per GB

For most small to medium applications, the free tier is sufficient.
