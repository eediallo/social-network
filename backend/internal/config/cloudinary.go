package config

import (
	"fmt"
	"os"
)

type CloudinaryConfig struct {
	CloudName   string
	APIKey      string
	APISecret   string
	Environment string
}

func LoadCloudinaryConfig() *CloudinaryConfig {
	config := &CloudinaryConfig{
		CloudName:   getEnv("CLOUDINARY_CLOUD_NAME", ""),
		APIKey:      getEnv("CLOUDINARY_API_KEY", ""),
		APISecret:   getEnv("CLOUDINARY_API_SECRET", ""),
		Environment: getEnv("CLOUDINARY_ENVIRONMENT", "production"),
	}

	// Debug logging
	if config.CloudName == "" {
		fmt.Println("Warning: CLOUDINARY_CLOUD_NAME not set")
	}
	if config.APIKey == "" {
		fmt.Println("Warning: CLOUDINARY_API_KEY not set")
	}
	if config.APISecret == "" {
		fmt.Println("Warning: CLOUDINARY_API_SECRET not set")
	}

	return config
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
