package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")

	fmt.Printf("CloudName: %s\n", cloudName)
	fmt.Printf("APIKey: %s\n", apiKey)
	fmt.Printf("APISecret: %s\n", apiSecret[:min(len(apiSecret), 8)]+"...")

	// Initialize Cloudinary
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		log.Fatalf("Failed to initialize Cloudinary: %v", err)
	}

	// Test upload with a simple string (base64)
	ctx := context.Background()
	result, err := cld.Upload.Upload(ctx, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", uploader.UploadParams{
		PublicID:     "test-upload",
		ResourceType: "image",
	})

	if err != nil {
		log.Fatalf("Upload failed: %v", err)
	}

	fmt.Printf("Upload successful: %+v\n", result)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
