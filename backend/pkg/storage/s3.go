package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Provider AWS S3 存储提供者
type S3Provider struct {
	client *s3.Client
	cfg    *S3Config
}

// NewS3Provider 创建 S3 存储提供者
func NewS3Provider(cfg *S3Config) (*S3Provider, error) {
	creds := credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")

	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(creds),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	var client *s3.Client
	if cfg.Endpoint != "" {
		client = s3.NewFromConfig(awsCfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
			o.UsePathStyle = true
		})
	} else {
		client = s3.NewFromConfig(awsCfg)
	}

	return &S3Provider{client: client, cfg: cfg}, nil
}

// Upload 上传文件
func (p *S3Provider) Upload(ctx context.Context, file io.Reader, path string, size int64) (string, error) {
	_, err := p.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(p.cfg.Bucket),
		Key:           aws.String(path),
		Body:          file,
		ContentLength: aws.Int64(size),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}
	return path, nil
}

// Delete 删除文件
func (p *S3Provider) Delete(ctx context.Context, path string) error {
	_, err := p.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(p.cfg.Bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		return fmt.Errorf("failed to delete from S3: %w", err)
	}
	return nil
}

// GetSignedURL 获取签名 URL
func (p *S3Provider) GetSignedURL(ctx context.Context, path string, expiry time.Duration) (string, error) {
	presignClient := s3.NewPresignClient(p.client)
	req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(p.cfg.Bucket),
		Key:    aws.String(path),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}
	return req.URL, nil
}
