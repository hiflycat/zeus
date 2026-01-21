package service

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"backend/internal/model"
	"backend/migrations"
)

type TicketService struct {
	notifySvc *NotificationService
}

func NewTicketService() *TicketService {
	return &TicketService{
		notifySvc: NewNotificationService(),
	}
}

func (s *TicketService) Create(ticket *model.Ticket) error {
	return migrations.GetDB().Create(ticket).Error
}

// CreateWithFormData 创建工单并保存动态表单数据
func (s *TicketService) CreateWithFormData(ticket *model.Ticket, formData map[string]interface{}) error {
	db := migrations.GetDB()
	tx := db.Begin()

	// 创建工单
	if err := tx.Create(ticket).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 如果有表单数据，获取类型对应的模板字段并保存
	if len(formData) > 0 && ticket.TypeID > 0 {
		var ticketType model.TicketType
		if err := tx.Preload("Template").Preload("Template.Fields").First(&ticketType, ticket.TypeID).Error; err == nil {
			if ticketType.Template != nil && len(ticketType.Template.Fields) > 0 {
				// 创建字段名到ID的映射
				fieldMap := make(map[string]uint)
				for _, field := range ticketType.Template.Fields {
					fieldMap[field.Name] = field.ID
				}

				// 保存表单数据
				for fieldName, value := range formData {
					if fieldID, ok := fieldMap[fieldName]; ok {
						var valueStr string
						switch v := value.(type) {
						case string:
							valueStr = v
						case []interface{}:
							// 多选字段，转为 JSON
							jsonBytes, _ := json.Marshal(v)
							valueStr = string(jsonBytes)
						default:
							// 其他类型转为字符串
							jsonBytes, _ := json.Marshal(v)
							valueStr = string(jsonBytes)
						}

						ticketData := model.TicketData{
							TicketID: ticket.ID,
							FieldID:  fieldID,
							Value:    valueStr,
						}
						if err := tx.Create(&ticketData).Error; err != nil {
							tx.Rollback()
							return err
						}
					}
				}
			}
		}
	}

	return tx.Commit().Error
}

func (s *TicketService) Update(id uint, ticket *model.Ticket) error {
	return migrations.GetDB().Model(&model.Ticket{}).Where("id = ?", id).Updates(ticket).Error
}

func (s *TicketService) Delete(id, userID uint, isAdmin bool) error {
	var ticket model.Ticket
	if err := migrations.GetDB().First(&ticket, id).Error; err != nil {
		return err
	}

	if !isAdmin {
		// 只有草稿和已取消的工单可以删除
		if ticket.Status != model.TicketStatusDraft && ticket.Status != model.TicketStatusCancelled {
			return errors.New("只有草稿或已取消的工单可以删除")
		}

		// 只有创建者可以删除
		if ticket.CreatorID != userID {
			return errors.New("只有创建者可以删除工单")
		}
	}

	return migrations.GetDB().Delete(&model.Ticket{}, id).Error
}

func (s *TicketService) GetByID(id uint) (*model.Ticket, error) {
	var ticket model.Ticket
	if err := migrations.GetDB().Preload("Type").Preload("Type.Template").Preload("Type.Template.Fields").
		Preload("Creator").Preload("Assignee").Preload("CurrentNode").
		Preload("Data").Preload("Data.Field").
		Preload("Comments").Preload("Comments.User").
		Preload("Attachments").Preload("Attachments.Uploader").
		Preload("ApprovalRecords").Preload("ApprovalRecords.Approver").Preload("ApprovalRecords.Node").
		First(&ticket, id).Error; err != nil {
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
	if err := db.Preload("Type").Preload("Creator").Preload("Assignee").Preload("CurrentNode").
		Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&tickets).Error; err != nil {
		return nil, 0, err
	}
	return tickets, total, nil
}

// ListForUser 获取与用户相关的工单（创建/审批/抄送/转审/加签）
func (s *TicketService) ListForUser(userID uint, page, pageSize int, keyword, status string, typeID uint) ([]model.Ticket, int64, error) {
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

	// 相关工单：创建者或审批记录涉及该用户（approver/delegate/cc）
	subQuery := migrations.GetDB().Model(&model.ApprovalRecord{}).
		Select("DISTINCT ticket_id").
		Where("approver_id = ? OR delegate_to_id = ?", userID, userID)

	db = db.Where("creator_id = ? OR id IN (?)", userID, subQuery)

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Preload("Type").Preload("Creator").Preload("Assignee").Preload("CurrentNode").
		Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&tickets).Error; err != nil {
		return nil, 0, err
	}
	return tickets, total, nil
}

// Submit 提交工单（从草稿变为待审批）
func (s *TicketService) Submit(id uint) error {
	var ticket model.Ticket
	if err := migrations.GetDB().Preload("Type").First(&ticket, id).Error; err != nil {
		return err
	}
	if ticket.Status != model.TicketStatusDraft {
		return errors.New("只有草稿状态的工单可以提交")
	}

	// 通过工单类型获取关联的审批流程
	var flow model.ApprovalFlow
	if ticket.Type.FlowID == nil {
		// 没有审批流程，直接进入处理中
		if err := migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status": model.TicketStatusProcessing,
		}).Error; err != nil {
			return err
		}
		go s.notifySvc.NotifyTicketCreated(&ticket)
		return nil
	}

	if err := migrations.GetDB().First(&flow, *ticket.Type.FlowID).Error; err != nil || !flow.Enabled {
		// 流程不存在或未启用，直接进入处理中
		if err := migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status": model.TicketStatusProcessing,
		}).Error; err != nil {
			return err
		}
		go s.notifySvc.NotifyTicketCreated(&ticket)
		return nil
	}

	// 查找第一个审批节点（非抄送节点）
	var firstNode model.FlowNode
	if err := migrations.GetDB().Where("flow_id = ? AND node_type != ?", flow.ID, model.FlowNodeTypeCC).
		Order("sort_order ASC").First(&firstNode).Error; err != nil {
		if err := migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status": model.TicketStatusProcessing,
		}).Error; err != nil {
			return err
		}
		go s.notifySvc.NotifyTicketCreated(&ticket)
		return nil
	}

	// 处理可能的抄送节点
	s.processCCNodes(flow.ID, &ticket)

	if err := migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
		"status":          model.TicketStatusPending,
		"flow_id":         flow.ID,
		"flow_version":    flow.Version,
		"current_node_id": firstNode.ID,
	}).Error; err != nil {
		return err
	}
	go s.notifySvc.NotifyTicketCreated(&ticket)
	return nil
}

// Approve 审批工单
func (s *TicketService) Approve(id, approverID uint, approved bool, comment string) error {
	var ticket model.Ticket
	if err := migrations.GetDB().Preload("Data").First(&ticket, id).Error; err != nil {
		return err
	}
	if ticket.Status != model.TicketStatusPending && ticket.Status != model.TicketStatusApproving {
		return errors.New("工单不在待审批状态")
	}
	if ticket.CurrentNodeID == nil {
		return errors.New("工单没有当前审批节点")
	}

	// 获取当前审批节点
	var currentNode model.FlowNode
	if err := migrations.GetDB().First(&currentNode, *ticket.CurrentNodeID).Error; err != nil {
		return err
	}

	// 创建审批记录
	action := model.ApprovalActionApprove
	result := "approved"
	if !approved {
		action = model.ApprovalActionReject
		result = "rejected"
	}
	record := model.ApprovalRecord{
		TicketID:   id,
		NodeID:     *ticket.CurrentNodeID,
		ApproverID: approverID,
		Action:     action,
		Result:     result,
		Comment:    comment,
	}
	if err := migrations.GetDB().Create(&record).Error; err != nil {
		return err
	}

	// 如果拒绝，直接结束流程
	if !approved {
		if err := migrations.GetDB().Model(&ticket).Updates(map[string]any{
			"status":          model.TicketStatusRejected,
			"current_node_id": nil,
		}).Error; err != nil {
			return err
		}
		go s.notifySvc.NotifyTicketApproved(&ticket, approved, comment)
		return nil
	}

	// 根据节点类型判断是否完成当前节点
	nodeComplete := s.isNodeComplete(&currentNode, &ticket, id)

	if !nodeComplete {
		// 会签未完成，保持当前节点，更新状态为审批中
		migrations.GetDB().Model(&ticket).Update("status", model.TicketStatusApproving)
		go s.notifySvc.NotifyTicketApproved(&ticket, approved, comment)
		return nil
	}

	// 查找下一个节点
	nextNode := s.getNextNode(&currentNode, &ticket)
	if nextNode == nil {
		// 没有下一个节点，审批完成
		if err := migrations.GetDB().Model(&ticket).Updates(map[string]any{
			"status":          model.TicketStatusProcessing,
			"current_node_id": nil,
		}).Error; err != nil {
			return err
		}
		go s.notifySvc.NotifyTicketApproved(&ticket, approved, comment)
		return nil
	}

	// 如果是抄送节点，跳过并处理
	for nextNode != nil && nextNode.NodeType == model.FlowNodeTypeCC {
		s.processOneCCNode(nextNode, &ticket)
		nextNode = s.getNextNode(nextNode, &ticket)
	}

	if nextNode == nil {
		// 没有下一个节点，审批完成
		if err := migrations.GetDB().Model(&ticket).Updates(map[string]any{
			"status":          model.TicketStatusProcessing,
			"current_node_id": nil,
		}).Error; err != nil {
			return err
		}
	} else {
		if err := migrations.GetDB().Model(&ticket).Updates(map[string]any{
			"status":          model.TicketStatusPending,
			"current_node_id": nextNode.ID,
		}).Error; err != nil {
			return err
		}
	}

	go s.notifySvc.NotifyTicketApproved(&ticket, approved, comment)
	return nil
}

// isNodeComplete 检查当前节点是否完成
func (s *TicketService) isNodeComplete(node *model.FlowNode, ticket *model.Ticket, ticketID uint) bool {
	switch node.NodeType {
	case model.FlowNodeTypeApprove, model.FlowNodeTypeOr:
		// 审批节点或或签节点：任一人通过即完成
		return true
	case model.FlowNodeTypeCountersign:
		// 会签节点：需要所有审批人都通过
		approverIDs := s.getApproverIDs(node, ticket)
		var approvedCount int64
		migrations.GetDB().Model(&model.ApprovalRecord{}).
			Where("ticket_id = ? AND node_id = ? AND result = ?", ticketID, node.ID, "approved").
			Count(&approvedCount)
		return int(approvedCount) >= len(approverIDs)
	case model.FlowNodeTypeCondition:
		// 条件节点：不需要审批，直接通过
		return true
	case model.FlowNodeTypeCC:
		// 抄送节点：不阻塞流程
		return true
	default:
		return true
	}
}

// getApproverIDs 获取节点的审批人ID列表
func (s *TicketService) getApproverIDs(node *model.FlowNode, ticket *model.Ticket) []uint {
	var approverIDs []uint

	switch node.ApproverType {
	case model.ApproverTypeRole:
		// 指定角色：获取该角色的所有用户
		roleID, _ := strconv.ParseUint(node.ApproverValue, 10, 64)
		var users []model.User
		migrations.GetDB().Joins("JOIN user_roles ON users.id = user_roles.user_id").
			Where("user_roles.role_id = ?", roleID).Find(&users)
		for _, u := range users {
			approverIDs = append(approverIDs, u.ID)
		}
	case model.ApproverTypeUser:
		// 指定用户：支持多个用户ID，逗号分隔
		ids := strings.Split(node.ApproverValue, ",")
		for _, idStr := range ids {
			if uid, err := strconv.ParseUint(strings.TrimSpace(idStr), 10, 64); err == nil {
				approverIDs = append(approverIDs, uint(uid))
			}
		}
	case model.ApproverTypeFormField:
		// 表单字段：从工单数据中获取
		for _, data := range ticket.Data {
			if data.Field != nil && data.Field.Name == node.ApproverValue {
				if uid, err := strconv.ParseUint(data.Value, 10, 64); err == nil {
					approverIDs = append(approverIDs, uint(uid))
				}
				break
			}
		}
	}

	return approverIDs
}

// getNextNode 获取下一个节点
func (s *TicketService) getNextNode(currentNode *model.FlowNode, ticket *model.Ticket) *model.FlowNode {
	// 条件节点：根据条件判断走哪个分支
	if currentNode.NodeType == model.FlowNodeTypeCondition {
		branchID := s.evaluateCondition(currentNode, ticket)
		if branchID != nil {
			var nextNode model.FlowNode
			if err := migrations.GetDB().First(&nextNode, *branchID).Error; err == nil {
				return &nextNode
			}
		}
		return nil
	}

	// 如果有明确的下一节点ID
	if currentNode.NextNodeID != nil {
		var nextNode model.FlowNode
		if err := migrations.GetDB().First(&nextNode, *currentNode.NextNodeID).Error; err == nil {
			return &nextNode
		}
	}

	// 否则按顺序查找下一个非抄送节点
	var nextNode model.FlowNode
	if err := migrations.GetDB().Where("flow_id = ? AND sort_order > ?", currentNode.FlowID, currentNode.SortOrder).
		Order("sort_order ASC").First(&nextNode).Error; err != nil {
		return nil
	}
	return &nextNode
}

// evaluateCondition 评估条件节点
func (s *TicketService) evaluateCondition(node *model.FlowNode, ticket *model.Ticket) *uint {
	if node.Condition == "" {
		return node.TrueBranchID
	}

	// 解析条件配置
	var condition struct {
		Field    string `json:"field"`
		Operator string `json:"operator"`
		Value    string `json:"value"`
	}
	if err := json.Unmarshal([]byte(node.Condition), &condition); err != nil {
		return node.TrueBranchID
	}

	// 从工单数据中获取字段值
	var fieldValue string
	for _, data := range ticket.Data {
		if data.Field != nil && data.Field.Name == condition.Field {
			fieldValue = data.Value
			break
		}
	}

	// 评估条件
	match := false
	switch condition.Operator {
	case "eq", "==":
		match = fieldValue == condition.Value
	case "ne", "!=":
		match = fieldValue != condition.Value
	case "gt", ">":
		fv, _ := strconv.ParseFloat(fieldValue, 64)
		cv, _ := strconv.ParseFloat(condition.Value, 64)
		match = fv > cv
	case "gte", ">=":
		fv, _ := strconv.ParseFloat(fieldValue, 64)
		cv, _ := strconv.ParseFloat(condition.Value, 64)
		match = fv >= cv
	case "lt", "<":
		fv, _ := strconv.ParseFloat(fieldValue, 64)
		cv, _ := strconv.ParseFloat(condition.Value, 64)
		match = fv < cv
	case "lte", "<=":
		fv, _ := strconv.ParseFloat(fieldValue, 64)
		cv, _ := strconv.ParseFloat(condition.Value, 64)
		match = fv <= cv
	case "contains":
		match = strings.Contains(fieldValue, condition.Value)
	}

	if match {
		return node.TrueBranchID
	}
	return node.FalseBranchID
}

// processCCNodes 处理流程开始时的抄送节点
func (s *TicketService) processCCNodes(flowID uint, ticket *model.Ticket) {
	var ccNodes []model.FlowNode
	migrations.GetDB().Where("flow_id = ? AND node_type = ? AND sort_order = 0", flowID, model.FlowNodeTypeCC).Find(&ccNodes)
	for _, node := range ccNodes {
		s.processOneCCNode(&node, ticket)
	}
}

// processOneCCNode 处理单个抄送节点
func (s *TicketService) processOneCCNode(node *model.FlowNode, ticket *model.Ticket) {
	ccUserIDs := s.getApproverIDs(node, ticket)
	for _, userID := range ccUserIDs {
		// 创建抄送记录
		record := model.ApprovalRecord{
			TicketID:   ticket.ID,
			NodeID:     node.ID,
			ApproverID: userID,
			Action:     model.ApprovalActionCC,
			Result:     "cc",
		}
		migrations.GetDB().Create(&record)
	}
	// 发送抄送通知
	go s.notifySvc.NotifyTicketCC(ticket, ccUserIDs)
}

// Withdraw 撤回工单
func (s *TicketService) Withdraw(id, userID uint) error {
	var ticket model.Ticket
	if err := migrations.GetDB().First(&ticket, id).Error; err != nil {
		return err
	}

	// 只有创建者可以撤回
	if ticket.CreatorID != userID {
		return errors.New("只有创建者可以撤回工单")
	}

	// 只有待审批或审批中的工单可以撤回
	if ticket.Status != model.TicketStatusPending && ticket.Status != model.TicketStatusApproving {
		return errors.New("只有待审批或审批中的工单可以撤回")
	}

	// 检查是否已经有审批记录（除了抄送）
	var approvalCount int64
	migrations.GetDB().Model(&model.ApprovalRecord{}).
		Where("ticket_id = ? AND action NOT IN ?", id, []string{model.ApprovalActionCC, model.ApprovalActionUrge}).
		Count(&approvalCount)
	if approvalCount > 0 {
		return errors.New("工单已有审批记录，无法撤回")
	}

	return migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
		"status":          model.TicketStatusWithdrawn,
		"current_node_id": nil,
	}).Error
}

// Urge 催办工单
func (s *TicketService) Urge(id, userID uint) error {
	var ticket model.Ticket
	if err := migrations.GetDB().Preload("CurrentNode").First(&ticket, id).Error; err != nil {
		return err
	}

	if ticket.Status != model.TicketStatusPending && ticket.Status != model.TicketStatusApproving {
		return errors.New("工单不在审批状态")
	}

	if ticket.CurrentNode == nil {
		return errors.New("工单没有当前审批节点")
	}

	// 创建催办记录
	record := model.ApprovalRecord{
		TicketID:   id,
		NodeID:     *ticket.CurrentNodeID,
		ApproverID: userID,
		Action:     model.ApprovalActionUrge,
	}
	if err := migrations.GetDB().Create(&record).Error; err != nil {
		return err
	}

	// 发送催办通知
	approverIDs := s.getApproverIDs(ticket.CurrentNode, &ticket)
	go s.notifySvc.NotifyTicketUrge(&ticket, approverIDs)

	return nil
}

// Transfer 转交工单
func (s *TicketService) Transfer(id, userID, targetUserID uint) error {
	var ticket model.Ticket
	if err := migrations.GetDB().First(&ticket, id).Error; err != nil {
		return err
	}

	// 只有处理中的工单可以转交
	if ticket.Status != model.TicketStatusProcessing {
		return errors.New("只有处理中的工单可以转交")
	}

	return migrations.GetDB().Model(&ticket).Update("assignee_id", targetUserID).Error
}

// Return 退回工单
func (s *TicketService) Return(id, approverID uint, comment string, toCreator bool) error {
	var ticket model.Ticket
	if err := migrations.GetDB().First(&ticket, id).Error; err != nil {
		return err
	}

	if ticket.Status != model.TicketStatusPending && ticket.Status != model.TicketStatusApproving {
		return errors.New("工单不在审批状态")
	}

	if ticket.CurrentNodeID == nil {
		return errors.New("工单没有当前审批节点")
	}

	// 创建退回记录
	record := model.ApprovalRecord{
		TicketID:   id,
		NodeID:     *ticket.CurrentNodeID,
		ApproverID: approverID,
		Action:     model.ApprovalActionReturn,
		Result:     "returned",
		Comment:    comment,
	}
	if err := migrations.GetDB().Create(&record).Error; err != nil {
		return err
	}

	if toCreator {
		// 退回给发起人修改
		return migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status":          model.TicketStatusDraft,
			"current_node_id": nil,
		}).Error
	}

	// 退回到上一节点
	var currentNode model.FlowNode
	if err := migrations.GetDB().First(&currentNode, *ticket.CurrentNodeID).Error; err != nil {
		return err
	}

	var prevNode model.FlowNode
	if err := migrations.GetDB().Where("flow_id = ? AND sort_order < ? AND node_type NOT IN ?",
		currentNode.FlowID, currentNode.SortOrder, []string{model.FlowNodeTypeCC, model.FlowNodeTypeCondition}).
		Order("sort_order DESC").First(&prevNode).Error; err != nil {
		// 没有上一节点，退回给发起人
		return migrations.GetDB().Model(&ticket).Updates(map[string]interface{}{
			"status":          model.TicketStatusDraft,
			"current_node_id": nil,
		}).Error
	}

	return migrations.GetDB().Model(&ticket).Update("current_node_id", prevNode.ID).Error
}

// Delegate 转审工单
func (s *TicketService) Delegate(id, approverID, targetUserID uint, comment string) error {
	var ticket model.Ticket
	if err := migrations.GetDB().First(&ticket, id).Error; err != nil {
		return err
	}

	if ticket.Status != model.TicketStatusPending && ticket.Status != model.TicketStatusApproving {
		return errors.New("工单不在审批状态")
	}

	if ticket.CurrentNodeID == nil {
		return errors.New("工单没有当前审批节点")
	}

	// 创建转审记录
	record := model.ApprovalRecord{
		TicketID:     id,
		NodeID:       *ticket.CurrentNodeID,
		ApproverID:   approverID,
		Action:       model.ApprovalActionDelegate,
		Comment:      comment,
		DelegateToID: &targetUserID,
	}
	return migrations.GetDB().Create(&record).Error
}

// AddSign 加签
func (s *TicketService) AddSign(id, approverID, targetUserID uint, comment string) error {
	var ticket model.Ticket
	if err := migrations.GetDB().First(&ticket, id).Error; err != nil {
		return err
	}

	if ticket.Status != model.TicketStatusPending && ticket.Status != model.TicketStatusApproving {
		return errors.New("工单不在审批状态")
	}

	if ticket.CurrentNodeID == nil {
		return errors.New("工单没有当前审批节点")
	}

	// 创建加签记录
	record := model.ApprovalRecord{
		TicketID:     id,
		NodeID:       *ticket.CurrentNodeID,
		ApproverID:   approverID,
		Action:       model.ApprovalActionAddSign,
		Comment:      comment,
		DelegateToID: &targetUserID,
	}
	return migrations.GetDB().Create(&record).Error
}

// Complete 完成工单
func (s *TicketService) Complete(id uint) error {
	now := time.Now()
	if err := migrations.GetDB().Model(&model.Ticket{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":       model.TicketStatusCompleted,
		"completed_at": &now,
	}).Error; err != nil {
		return err
	}
	var ticket model.Ticket
	if migrations.GetDB().First(&ticket, id).Error == nil {
		go s.notifySvc.NotifyTicketCompleted(&ticket)
	}
	return nil
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

	// 构建查询条件
	db := migrations.GetDB().Model(&model.Ticket{}).
		Joins("JOIN flow_nodes ON tickets.current_node_id = flow_nodes.id").
		Where("tickets.status IN ?", []string{model.TicketStatusPending, model.TicketStatusApproving})

	// 查找符合条件的工单：
	// 1. 节点审批人类型是角色，且用户拥有该角色
	// 2. 节点审批人类型是用户，且指定了该用户
	// 3. 有转审记录指向该用户
	userIDStr := strconv.FormatUint(uint64(userID), 10)
	conditions := []string{}
	args := []interface{}{}

	if len(roleIDs) > 0 {
		conditions = append(conditions, "(flow_nodes.approver_type = ? AND flow_nodes.approver_value IN ?)")
		roleIDStrs := make([]string, len(roleIDs))
		for i, rid := range roleIDs {
			roleIDStrs[i] = strconv.FormatUint(uint64(rid), 10)
		}
		args = append(args, model.ApproverTypeRole, roleIDStrs)
	}

	conditions = append(conditions, "(flow_nodes.approver_type = ? AND FIND_IN_SET(?, flow_nodes.approver_value))")
	args = append(args, model.ApproverTypeUser, userIDStr)

	if len(conditions) > 0 {
		db = db.Where(strings.Join(conditions, " OR "), args...)
	}

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Preload("Type").Preload("Creator").Preload("CurrentNode").
		Order("tickets.created_at DESC").Offset(offset).Limit(pageSize).Find(&tickets).Error; err != nil {
		return nil, 0, err
	}

	return tickets, total, nil
}

// GetProcessedTickets 获取我处理过的工单
func (s *TicketService) GetProcessedTickets(userID uint, page, pageSize int) ([]model.Ticket, int64, error) {
	var tickets []model.Ticket
	var total int64

	// 查找用户有审批记录的工单
	subQuery := migrations.GetDB().Model(&model.ApprovalRecord{}).
		Select("DISTINCT ticket_id").
		Where("approver_id = ?", userID)

	db := migrations.GetDB().Model(&model.Ticket{}).
		Where("id IN (?)", subQuery)

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Preload("Type").Preload("Creator").Preload("CurrentNode").
		Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&tickets).Error; err != nil {
		return nil, 0, err
	}

	return tickets, total, nil
}

// GetCCTickets 获取抄送我的工单
func (s *TicketService) GetCCTickets(userID uint, page, pageSize int) ([]model.Ticket, int64, error) {
	var tickets []model.Ticket
	var total int64

	// 查找抄送给用户的工单（通过审批记录中的 action = 'cc' 且 delegate_to_id = userID）
	subQuery := migrations.GetDB().Model(&model.ApprovalRecord{}).
		Select("DISTINCT ticket_id").
		Where("delegate_to_id = ? AND action = ?", userID, model.ApprovalActionCC)

	db := migrations.GetDB().Model(&model.Ticket{}).
		Where("id IN (?)", subQuery)

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Preload("Type").Preload("Creator").Preload("CurrentNode").
		Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&tickets).Error; err != nil {
		return nil, 0, err
	}

	return tickets, total, nil
}

// GetApprovalRecords 获取工单的审批记录
func (s *TicketService) GetApprovalRecords(ticketID uint) ([]model.ApprovalRecord, error) {
	var records []model.ApprovalRecord
	if err := migrations.GetDB().Preload("Approver").Preload("Node").Preload("DelegateTo").
		Where("ticket_id = ?", ticketID).
		Order("created_at ASC").
		Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

// CanUserApprove 检查用户是否可以审批该工单
func (s *TicketService) CanUserApprove(ticketID, userID uint) (bool, error) {
	var user model.User
	if err := migrations.GetDB().Preload("Roles").First(&user, userID).Error; err == nil {
		for _, role := range user.Roles {
			if role.Name == "admin" {
				return true, nil
			}
		}
	}

	var ticket model.Ticket
	if err := migrations.GetDB().Preload("Data").Preload("Data.Field").First(&ticket, ticketID).Error; err != nil {
		return false, err
	}

	if (ticket.Status != model.TicketStatusPending && ticket.Status != model.TicketStatusApproving) || ticket.CurrentNodeID == nil {
		return false, nil
	}

	// 获取当前审批节点
	var node model.FlowNode
	if err := migrations.GetDB().First(&node, *ticket.CurrentNodeID).Error; err != nil {
		return false, err
	}

	// 检查是否有转审给该用户
	var delegateCount int64
	migrations.GetDB().Model(&model.ApprovalRecord{}).
		Where("ticket_id = ? AND node_id = ? AND action = ? AND delegate_to_id = ?",
			ticketID, node.ID, model.ApprovalActionDelegate, userID).
		Count(&delegateCount)
	if delegateCount > 0 {
		return true, nil
	}

	// 检查是否有加签给该用户
	var addSignCount int64
	migrations.GetDB().Model(&model.ApprovalRecord{}).
		Where("ticket_id = ? AND node_id = ? AND action = ? AND delegate_to_id = ?",
			ticketID, node.ID, model.ApprovalActionAddSign, userID).
		Count(&addSignCount)
	if addSignCount > 0 {
		return true, nil
	}

	// 获取审批人列表
	approverIDs := s.getApproverIDs(&node, &ticket)
	for _, aid := range approverIDs {
		if aid == userID {
			return true, nil
		}
	}

	return false, nil
}

// SaveTicketData 保存工单表单数据
func (s *TicketService) SaveTicketData(ticketID uint, data []model.TicketData) error {
	// 删除旧数据
	if err := migrations.GetDB().Where("ticket_id = ?", ticketID).Delete(&model.TicketData{}).Error; err != nil {
		return err
	}

	// 保存新数据
	for i := range data {
		data[i].TicketID = ticketID
	}
	if len(data) > 0 {
		return migrations.GetDB().Create(&data).Error
	}
	return nil
}
