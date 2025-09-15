package services

import (
	"context"
	"fmt"
	"mime/multipart"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/google/uuid"

	"social-network/backend/internal/config"
)

type CloudinaryService struct {
	cld *cloudinary.Cloudinary
}

type UploadResult struct {
	PublicID  string `json:"public_id"`
	URL       string `json:"url"`
	SecureURL string `json:"secure_url"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
	Format    string `json:"format"`
	Bytes     int    `json:"bytes"`
}

func NewCloudinaryService(cfg *config.CloudinaryConfig) (*CloudinaryService, error) {
	if cfg.CloudName == "" || cfg.APIKey == "" || cfg.APISecret == "" {
		return nil, fmt.Errorf("cloudinary configuration is incomplete")
	}

	cld, err := cloudinary.NewFromParams(cfg.CloudName, cfg.APIKey, cfg.APISecret)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize cloudinary: %w", err)
	}

	return &CloudinaryService{cld: cld}, nil
}

func (s *CloudinaryService) UploadAvatar(ctx context.Context, file multipart.File, userID string) (*UploadResult, error) {
	// Generate unique public ID for avatar
	publicID := fmt.Sprintf("avatars/%s", userID)

	// Upload with specific transformations for avatars
	result, err := s.cld.Upload.Upload(ctx, file, uploader.UploadParams{
		PublicID:       publicID,
		Folder:         "social-network/avatars",
		ResourceType:   "image",
		Transformation: "c_thumb,g_face,h_200,w_200/r_max/f_auto/q_auto",
		Overwrite:      &[]bool{true}[0],
		UniqueFilename: &[]bool{false}[0],
	})

	if err != nil {
		return nil, fmt.Errorf("failed to upload avatar: %w", err)
	}

	return &UploadResult{
		PublicID:  result.PublicID,
		URL:       result.URL,
		SecureURL: result.SecureURL,
		Width:     result.Width,
		Height:    result.Height,
		Format:    result.Format,
		Bytes:     result.Bytes,
	}, nil
}

func (s *CloudinaryService) UploadPostImage(ctx context.Context, file multipart.File, postID string) (*UploadResult, error) {
	// Generate unique public ID for post image
	imageID := uuid.NewString()
	publicID := fmt.Sprintf("posts/%s/%s", postID, imageID)

	fmt.Printf("Cloudinary upload params: PublicID=%s, Folder=social-network/posts\n", publicID)

	// Upload with optimizations for post images
	result, err := s.cld.Upload.Upload(ctx, file, uploader.UploadParams{
		PublicID:       publicID,
		Folder:         "social-network/posts",
		ResourceType:   "image",
		Transformation: "c_limit,w_1200/f_auto/q_auto",
		Overwrite:      &[]bool{false}[0],
		UniqueFilename: &[]bool{true}[0],
	})

	if err != nil {
		return nil, fmt.Errorf("failed to upload post image: %w", err)
	}

	fmt.Printf("Cloudinary upload result: PublicID=%s, URL=%s, SecureURL=%s, Width=%d, Height=%d, Format=%s, Bytes=%d\n",
		result.PublicID, result.URL, result.SecureURL, result.Width, result.Height, result.Format, result.Bytes)

	// Validate the result
	if result.PublicID == "" {
		return nil, fmt.Errorf("upload succeeded but no public ID returned")
	}
	if result.URL == "" && result.SecureURL == "" {
		return nil, fmt.Errorf("upload succeeded but no URL returned")
	}

	return &UploadResult{
		PublicID:  result.PublicID,
		URL:       result.URL,
		SecureURL: result.SecureURL,
		Width:     result.Width,
		Height:    result.Height,
		Format:    result.Format,
		Bytes:     result.Bytes,
	}, nil
}

func (s *CloudinaryService) DeleteImage(ctx context.Context, publicID string) error {
	_, err := s.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: "image",
	})

	if err != nil {
		return fmt.Errorf("failed to delete image: %w", err)
	}

	return nil
}

func (s *CloudinaryService) GetImageURL(publicID string, transformations ...string) string {
	// For now, return the base URL - transformations can be added later
	// The upload result already includes optimized URLs
	return fmt.Sprintf("https://res.cloudinary.com/%s/image/upload/%s", s.cld.Config.Cloud.CloudName, publicID)
}

func (s *CloudinaryService) GetThumbnailURL(publicID string, width, height int) string {
	transformStr := fmt.Sprintf("c_thumb,g_auto,h_%d,w_%d/r_max/f_auto/q_auto", height, width)
	return fmt.Sprintf("https://res.cloudinary.com/%s/image/upload/%s/%s", s.cld.Config.Cloud.CloudName, transformStr, publicID)
}

func (s *CloudinaryService) GetOptimizedURL(publicID string, maxWidth int) string {
	transformStr := fmt.Sprintf("c_limit,w_%d/f_auto/q_auto", maxWidth)
	return fmt.Sprintf("https://res.cloudinary.com/%s/image/upload/%s/%s", s.cld.Config.Cloud.CloudName, transformStr, publicID)
}

// Helper function to get file extension from content type
func getFileExtension(contentType string) string {
	switch contentType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".jpg" // default fallback
	}
}
