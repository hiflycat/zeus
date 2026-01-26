package service

import (
	"backend/internal/model"
	"backend/internal/global"
)

type CommentService struct{}

func NewCommentService() *CommentService {
	return &CommentService{}
}

// Create 创建评论
func (s *CommentService) Create(comment *model.TicketComment) error {
	return global.GetDB().Create(comment).Error
}

// Delete 删除评论
func (s *CommentService) Delete(id, userID uint) error {
	// 只能删除自己的评论
	return global.GetDB().Where("id = ? AND user_id = ?", id, userID).Delete(&model.TicketComment{}).Error
}

// GetByTicketID 获取工单的评论列表
func (s *CommentService) GetByTicketID(ticketID uint) ([]model.TicketComment, error) {
	var comments []model.TicketComment
	if err := global.GetDB().Preload("User").
		Where("ticket_id = ?", ticketID).
		Order("created_at ASC").
		Find(&comments).Error; err != nil {
		return nil, err
	}
	return comments, nil
}
