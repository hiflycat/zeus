package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"time"

	"github.com/google/uuid"

	"backend/internal/model"
	"backend/migrations"
	"backend/pkg/storage"
)

type AttachmentService struct {
	configSvc *SystemConfigService
}

func NewAttachmentService() *AttachmentService {
	return &AttachmentService{
		configSvc: NewSystemConfigService(),
	}
}

// getStorageProvider 获取存储提供者
func (s *AttachmentService) getStorageProvider() (storage.Provider, error) {
	config, err := s.configSvc.GetByKey("storage")
	if err != nil || config == nil || config.Value == "" {
		return nil, errors.New("存储服务未配置，请先在系统设置中配置存储服务")
	}

	var cfg storage.Config
	if err := json.Unmarshal([]byte(config.Value), &cfg); err != nil {
		return nil, fmt.Errorf("存储配置解析失败: %w", err)
	}

	return storage.NewProvider(&cfg)
}

// Upload 上传附件
func (s *AttachmentService) Upload(ctx context.Context, ticketID uint, commentID *uint, uploaderID uint, fileName string, fileSize int64, mimeType string, file io.Reader) (*model.TicketAttachment, error) {
	provider, err := s.getStorageProvider()
	if err != nil {
		return nil, err
	}

	// 生成存储路径
	ext := filepath.Ext(fileName)
	storagePath := fmt.Sprintf("tickets/%d/%s%s", ticketID, uuid.New().String(), ext)

	// 上传文件
	if _, err := provider.Upload(ctx, file, storagePath, fileSize); err != nil {
		return nil, fmt.Errorf("文件上传失败: %w", err)
	}

	// 保存附件记录
	attachment := &model.TicketAttachment{
		TicketID:    ticketID,
		CommentID:   commentID,
		FileName:    fileName,
		FileSize:    fileSize,
		MimeType:    mimeType,
		StoragePath: storagePath,
		UploaderID:  uploaderID,
	}
	if err := migrations.GetDB().Create(attachment).Error; err != nil {
		provider.Delete(ctx, storagePath)
		return nil, err
	}

	return attachment, nil
}

// Delete 删除附件
func (s *AttachmentService) Delete(ctx context.Context, id uint) error {
	var attachment model.TicketAttachment
	if err := migrations.GetDB().First(&attachment, id).Error; err != nil {
		return err
	}

	if provider, err := s.getStorageProvider(); err == nil {
		provider.Delete(ctx, attachment.StoragePath)
	}

	return migrations.GetDB().Delete(&attachment).Error
}

// GetByID 根据ID获取附件
func (s *AttachmentService) GetByID(id uint) (*model.TicketAttachment, error) {
	var attachment model.TicketAttachment
	if err := migrations.GetDB().First(&attachment, id).Error; err != nil {
		return nil, err
	}
	return &attachment, nil
}

// GetByTicketID 获取工单的所有附件
func (s *AttachmentService) GetByTicketID(ticketID uint) ([]model.TicketAttachment, error) {
	var attachments []model.TicketAttachment
	if err := migrations.GetDB().Where("ticket_id = ?", ticketID).Find(&attachments).Error; err != nil {
		return nil, err
	}
	return attachments, nil
}

// GetDownloadURL 获取附件下载URL
func (s *AttachmentService) GetDownloadURL(ctx context.Context, id uint) (string, error) {
	attachment, err := s.GetByID(id)
	if err != nil {
		return "", err
	}

	provider, err := s.getStorageProvider()
	if err != nil {
		return "", err
	}

	return provider.GetSignedURL(ctx, attachment.StoragePath, 15*time.Minute)
}
