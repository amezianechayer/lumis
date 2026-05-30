package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type StorageService struct {
	client   *s3.Client
	bucket   string
	endpoint string
	enabled  bool
}

func NewStorageService(accountID, accessKey, secretKey, bucket, endpoint string) *StorageService {
	if accessKey == "" || secretKey == "" {
		return &StorageService{enabled: false}
	}

	creds := credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")
	cfg := aws.Config{
		Credentials: creds,
		Region:      "auto",
		EndpointResolverWithOptions: aws.EndpointResolverWithOptionsFunc(
			func(service, region string, options ...interface{}) (aws.Endpoint, error) {
				return aws.Endpoint{URL: endpoint}, nil
			},
		),
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &StorageService{
		client:   client,
		bucket:   bucket,
		endpoint: endpoint,
		enabled:  true,
	}
}

// UploadBase64 uploads a base64-encoded image (data:image/jpeg;base64,...) and returns the public URL.
func (s *StorageService) UploadBase64(ctx context.Context, folder string, userID uuid.UUID, dataURL string) (string, error) {
	if !s.enabled {
		return "", nil
	}

	contentType, raw, err := parseDataURL(dataURL)
	if err != nil {
		return "", fmt.Errorf("parse data URL: %w", err)
	}

	decoded, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		return "", fmt.Errorf("decode base64: %w", err)
	}

	ext := "jpg"
	if strings.Contains(contentType, "png") {
		ext = "png"
	}

	key := fmt.Sprintf("%s/%s/%d.%s", folder, userID.String(), time.Now().UnixMilli(), ext)

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(decoded),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("upload to R2: %w", err)
	}

	publicURL := fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucket, key)
	return publicURL, nil
}

func parseDataURL(dataURL string) (contentType, data string, err error) {
	// data:image/jpeg;base64,/9j/...
	if !strings.HasPrefix(dataURL, "data:") {
		// Already raw base64 or a URL — return as-is
		return "image/jpeg", dataURL, nil
	}
	comma := strings.Index(dataURL, ",")
	if comma < 0 {
		return "", "", fmt.Errorf("invalid data URL format")
	}
	meta := dataURL[5:comma] // image/jpeg;base64
	parts := strings.Split(meta, ";")
	return parts[0], dataURL[comma+1:], nil
}
