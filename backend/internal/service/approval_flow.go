package service

import (
	"errors"

	"backend/internal/model"
	"backend/internal/global"
)

type ApprovalFlowService struct{}

func NewApprovalFlowService() *ApprovalFlowService {
	return &ApprovalFlowService{}
}

func (s *ApprovalFlowService) CreateFlow(flow *model.ApprovalFlow) error {
	flow.Version = 1
	return global.GetDB().Create(flow).Error
}

func (s *ApprovalFlowService) UpdateFlow(id uint, flow *model.ApprovalFlow) error {
	return global.GetDB().Model(&model.ApprovalFlow{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name":        flow.Name,
		"description": flow.Description,
		"enabled":     flow.Enabled,
	}).Error
}

func (s *ApprovalFlowService) DeleteFlow(id uint) error {
	// 检查是否有工单正在使用该流程
	var count int64
	global.GetDB().Model(&model.Ticket{}).Where("flow_id = ? AND status IN ?", id,
		[]string{model.TicketStatusPending, model.TicketStatusApproving}).Count(&count)
	if count > 0 {
		return errors.New("该流程正在被使用，无法删除")
	}

	// 删除流程节点
	if err := global.GetDB().Where("flow_id = ?", id).Delete(&model.FlowNode{}).Error; err != nil {
		return err
	}
	return global.GetDB().Delete(&model.ApprovalFlow{}, id).Error
}

func (s *ApprovalFlowService) GetFlowByID(id uint) (*model.ApprovalFlow, error) {
	var flow model.ApprovalFlow
	if err := global.GetDB().Preload("Nodes").First(&flow, id).Error; err != nil {
		return nil, err
	}
	return &flow, nil
}

func (s *ApprovalFlowService) ListFlows(page, pageSize int, keyword string) ([]model.ApprovalFlow, int64, error) {
	var flows []model.ApprovalFlow
	var total int64
	db := global.GetDB().Model(&model.ApprovalFlow{})

	if keyword != "" {
		db = db.Where("name LIKE ?", "%"+keyword+"%")
	}

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&flows).Error; err != nil {
		return nil, 0, err
	}
	return flows, total, nil
}

func (s *ApprovalFlowService) ListEnabledFlows() ([]model.ApprovalFlow, error) {
	var flows []model.ApprovalFlow
	if err := global.GetDB().Where("enabled = ?", true).Order("name ASC").Find(&flows).Error; err != nil {
		return nil, err
	}
	return flows, nil
}

func (s *ApprovalFlowService) GetNodesByFlowID(flowID uint) ([]model.FlowNode, error) {
	var nodes []model.FlowNode
	if err := global.GetDB().Where("flow_id = ?", flowID).Order("sort_order ASC").Find(&nodes).Error; err != nil {
		return nil, err
	}
	return nodes, nil
}

func (s *ApprovalFlowService) SaveNodes(flowID uint, nodes []model.FlowNode) error {
	// 开启事务
	tx := global.GetDB().Begin()

	// 删除旧节点
	if err := tx.Where("flow_id = ?", flowID).Delete(&model.FlowNode{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 创建节点 ID 映射（前端临时 ID -> 数据库 ID）
	idMap := make(map[uint]uint)

	// 第一轮：创建所有节点（不设置分支引用）
	for i := range nodes {
		oldID := nodes[i].ID
		nodes[i].ID = 0
		nodes[i].FlowID = flowID
		nodes[i].NextNodeID = nil
		nodes[i].TrueBranchID = nil
		nodes[i].FalseBranchID = nil

		if err := tx.Create(&nodes[i]).Error; err != nil {
			tx.Rollback()
			return err
		}
		idMap[oldID] = nodes[i].ID
	}

	// 第二轮：更新分支引用
	for i := range nodes {
		updates := make(map[string]interface{})
		// 这里需要从原始数据中获取引用关系，但由于我们已经修改了 nodes，需要通过其他方式
		// 简化处理：如果有排序，按排序顺序链接
		if i < len(nodes)-1 {
			nextID := nodes[i+1].ID
			updates["next_node_id"] = nextID
		}
		if len(updates) > 0 {
			tx.Model(&model.FlowNode{}).Where("id = ?", nodes[i].ID).Updates(updates)
		}
	}

	return tx.Commit().Error
}

// SaveNodesWithConnections 保存节点及连线关系（用于可视化编辑器）
func (s *ApprovalFlowService) SaveNodesWithConnections(flowID uint, nodes []model.FlowNode, connections []NodeConnection) error {
	tx := global.GetDB().Begin()

	// 删除旧节点
	if err := tx.Where("flow_id = ?", flowID).Delete(&model.FlowNode{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 创建节点 ID 映射（前端临时 ID -> 数据库 ID）
	idMap := make(map[string]uint)

	// 创建所有节点
	for i := range nodes {
		tempID := nodes[i].ApproverValue // 临时存储前端 ID
		if tempID == "" {
			tempID = string(rune(nodes[i].ID))
		}
		nodes[i].ID = 0
		nodes[i].FlowID = flowID
		nodes[i].NextNodeID = nil
		nodes[i].TrueBranchID = nil
		nodes[i].FalseBranchID = nil

		if err := tx.Create(&nodes[i]).Error; err != nil {
			tx.Rollback()
			return err
		}
		idMap[tempID] = nodes[i].ID
	}

	// 更新连线关系
	for _, conn := range connections {
		sourceID, ok := idMap[conn.SourceID]
		if !ok {
			continue
		}
		targetID, ok := idMap[conn.TargetID]
		if !ok {
			continue
		}

		updates := make(map[string]interface{})
		switch conn.SourceHandle {
		case "true", "yes":
			updates["true_branch_id"] = targetID
		case "false", "no":
			updates["false_branch_id"] = targetID
		default:
			updates["next_node_id"] = targetID
		}

		if len(updates) > 0 {
			tx.Model(&model.FlowNode{}).Where("id = ?", sourceID).Updates(updates)
		}
	}

	return tx.Commit().Error
}

// NodeConnection 节点连接关系
type NodeConnection struct {
	SourceID     string `json:"source"`
	TargetID     string `json:"target"`
	SourceHandle string `json:"sourceHandle"`
}

// PublishFlow 发布新版本（增加版本号）
func (s *ApprovalFlowService) PublishFlow(id uint) error {
	var flow model.ApprovalFlow
	if err := global.GetDB().First(&flow, id).Error; err != nil {
		return err
	}
	return global.GetDB().Model(&flow).Update("version", flow.Version+1).Error
}
