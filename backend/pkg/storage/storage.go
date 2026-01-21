package storage

import (
	"context"
	"fmt"
	"io"
	"time"
)

// Provider 存储提供者接口
type Provider interface {
	Upload(ctx context.Context, file io.Reader, path string, size int64) (string, error)
	Delete(ctx context.Context, path string) error
	GetSignedURL(ctx context.Context, path string, expiry time.Duration) (string, error)
}

// Config 存储配置
type Config struct {
	Provider string    `json:"provider"` // oss 或 s3
	OSS      OSSConfig `json:"oss"`
	S3       S3Config  `json:"s3"`
}

// OSSConfig 阿里云 OSS 配置
type OSSConfig struct {
	Endpoint        string `json:"endpoint"`
	AccessKeyID     string `json:"access_key_id"`
	AccessKeySecret string `json:"access_key_secret"`
	Bucket          string `json:"bucket"`
}

// S3Config AWS S3 配置
type S3Config struct {
	Region          string `json:"region"`
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key"`
	Bucket          string `json:"bucket"`
	Endpoint        string `json:"endpoint"` // 可选，用于兼容 S3 的服务
}

// NewProvider 根据配置创建存储提供者
func NewProvider(cfg *Config) (Provider, error) {
	switch cfg.Provider {
	case "oss":
		return NewOSSProvider(&cfg.OSS)
	case "s3":
		return NewS3Provider(&cfg.S3)
	default:
		return nil, fmt.Errorf("unsupported storage provider: %s", cfg.Provider)
	}
}
