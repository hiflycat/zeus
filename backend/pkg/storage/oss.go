package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

// OSSProvider 阿里云 OSS 存储提供者
type OSSProvider struct {
	client *oss.Client
	bucket *oss.Bucket
	config *OSSConfig
}

// NewOSSProvider 创建 OSS 存储提供者
func NewOSSProvider(cfg *OSSConfig) (*OSSProvider, error) {
	client, err := oss.New(cfg.Endpoint, cfg.AccessKeyID, cfg.AccessKeySecret)
	if err != nil {
		return nil, fmt.Errorf("failed to create OSS client: %w", err)
	}
	bucket, err := client.Bucket(cfg.Bucket)
	if err != nil {
		return nil, fmt.Errorf("failed to get OSS bucket: %w", err)
	}
	return &OSSProvider{client: client, bucket: bucket, config: cfg}, nil
}

// Upload 上传文件
func (p *OSSProvider) Upload(ctx context.Context, file io.Reader, path string, size int64) (string, error) {
	if err := p.bucket.PutObject(path, file); err != nil {
		return "", fmt.Errorf("failed to upload to OSS: %w", err)
	}
	return path, nil
}

// Delete 删除文件
func (p *OSSProvider) Delete(ctx context.Context, path string) error {
	if err := p.bucket.DeleteObject(path); err != nil {
		return fmt.Errorf("failed to delete from OSS: %w", err)
	}
	return nil
}

// GetSignedURL 获取签名 URL
func (p *OSSProvider) GetSignedURL(ctx context.Context, path string, expiry time.Duration) (string, error) {
	url, err := p.bucket.SignURL(path, oss.HTTPGet, int64(expiry.Seconds()))
	if err != nil {
		return "", fmt.Errorf("failed to generate signed URL: %w", err)
	}
	return url, nil
}
