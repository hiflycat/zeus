package service

import (
	"errors"
	"time"

	"backend/internal/model"
	"backend/migrations"
)

type TicketService struct{}

func NewTicketService() *TicketService {
	return &TicketService{}
}

func (s *TicketService) Create(ticket *model.Ticket) error {
	return migrations.GetDB().Create(ticket).Error
}

func (s *TicketService) Update(id uint, ticket *model.Ticket) error {
	return migrations.GetDB().Model(&model.Ticket{}).Where("id = ?", id).Updates(ticket).Error
}

func (s *TicketService) Delete(id uint) error {
	return migrations.GetDB().Delete(&model.Ticket{}, id).Error
}

func (s *TicketService) GetByID(id uint) (*model.Ticket, error) {
	var ticket model.Ticket
	if err := migrations.GetDB().Preload("Type").Preload("Creator").Preload("Assignee").First(&ticket, id).Error; err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (s *TicketService) List(page, pageSize int, keyword, status string, typeID, creatorID uint) ([]model.Ticket, int64, error) {
	var tickets []model.Ticket
	var total int64
	db := migrations.GetDB().Model(&model.Ticket{})

	if keyword != "" {
		db = db.Where("title LIKE ?", "%"+keyword+"%")
	}
	if status != "" {
		db = db.Where("status = ?", status)
	}
	if typeID > 0 {
		db = db.Where("type_id = ?", typeID)
	}
	if creatorID > 0 {
		db = db.Where("creator_id = ?", creatorID)
	}

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Preload("Type").Preload("Creator").Preload("Assignee").
		Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&tickets).Error; err != nil {
		return nil, 0, err
	}
	return tickets, total, nil
}

// Submit 提交工单（从草稿变为待审批）
func (s *TicketService) Submit(id uint) error {
	var ticket model.Ticket
	if err := migrations.GetDB().First(&ticket, id).Error; err != nil {
		return err
	}
	if ticket.Status != model.TicketStatusDraft {
		return errors.New("只有草稿状态的工单可以提交")
	}

	// 查找审批流程
	var flow model.ApprovalFlow
	if err := migrations.GetDB().Where("type_id = ? AND enabled = ?", ticket.TypeID, true).First(&flow).Error; err != nil {
		// 没有审批流程，直接进入处理中
		return migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status": model.TicketStatusProcessing,
		}).Error
	}

	// 查找第一个审批节点
	var firstNode model.ApprovalNode
	if err := migrations.GetDB().Where("flow_id = ?", flow.ID).Order("sort_order ASC").First(&firstNode).Error; err != nil {
		return migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status": model.TicketStatusProcessing,
		}).Error
	}

	return migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
		"status":          model.TicketStatusPending,
		"current_node_id": firstNode.ID,
	}).Error
}

// Approve 审批工单
func (s *TicketService) Approve(id, approverID uint, approved bool, comment string) error {
	var ticket model.Ticket
	if err := migrations.GetDB().First(&ticket, id).Error; err != nil {
		return err
	}
	if ticket.Status != model.TicketStatusPending {
		return errors.New("工单不在待审批状态")
	}
	if ticket.CurrentNodeID == nil {
		return errors.New("工单没有当前审批节点")
	}

	// 创建审批记录
	result := "approved"
	if !approved {
		result = "rejected"
	}
	record := model.ApprovalRecord{
		TicketID:   id,
		NodeID:     *ticket.CurrentNodeID,
		ApproverID: approverID,
		Result:     result,
		Comment:    comment,
	}
	if err := migrations.GetDB().Create(&record).Error; err != nil {
		return err
	}

	if !approved {
		return migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status":          model.TicketStatusRejected,
			"current_node_id": nil,
		}).Error
	}

	// 查找下一个审批节点
	var currentNode model.ApprovalNode
	migrations.GetDB().First(&currentNode, *ticket.CurrentNodeID)

	var nextNode model.ApprovalNode
	if err := migrations.GetDB().Where("flow_id = ? AND sort_order > ?", currentNode.FlowID, currentNode.SortOrder).
		Order("sort_order ASC").First(&nextNode).Error; err != nil {
		// 没有下一个节点，审批完成
		return migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status":          model.TicketStatusProcessing,
			"current_node_id": nil,
		}).Error
	}

	return migrations.GetDB().Model(&ticket).Update("current_node_id", nextNode.ID).Error
}

// Complete 完成工单
func (s *TicketService) Complete(id uint) error {
	now := time.Now()
	return migrations.GetDB().Model(&model.Ticket{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":       model.TicketStatusCompleted,
		"completed_at": &now,
	}).Error
}

// Cancel 取消工单
func (s *TicketService) Cancel(id uint) error {
	return migrations.GetDB().Model(&model.Ticket{}).Where("id = ?", id).Update("status", model.TicketStatusCancelled).Error
}

// GetMyTickets 获取我创建的工单
func (s *TicketService) GetMyTickets(userID uint, page, pageSize int) ([]model.Ticket, int64, error) {
	return s.List(page, pageSize, "", "", 0, userID)
}

// GetPendingApprovals 获取待我审批的工单
func (s *TicketService) GetPendingApprovals(userID uint, page, pageSize int) ([]model.Ticket, int64, error) {
	var tickets []model.Ticket
	var total int64

	// 获取用户的角色
	var user model.User
	if err := migrations.GetDB().Preload("Roles").First(&user, userID).Error; err != nil {
		return nil, 0, err
	}

	var roleIDs []uint
	for _, role := range user.Roles {
		roleIDs = append(roleIDs, role.ID)
	}

	if len(roleIDs) == 0 {
		return tickets, 0, nil
	}

	// 查找当前节点角色匹配的待审批工单
	db := migrations.GetDB().Model(&model.Ticket{}).
		Joins("JOIN approval_nodes ON tickets.current_node_id = approval_nodes.id").
		Where("tickets.status = ? AND approval_nodes.role_id IN ?", model.TicketStatusPending, roleIDs)

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Preload("Type").Preload("Creator").
		Order("tickets.created_at DESC").Offset(offset).Limit(pageSize).Find(&tickets).Error; err != nil {
		return nil, 0, err
	}

	return tickets, total, nil
}
