package service

import (
	"backend/internal/model"
	"backend/migrations"
)

type ApprovalFlowService struct{}

func NewApprovalFlowService() *ApprovalFlowService {
	return &ApprovalFlowService{}
}

func (s *ApprovalFlowService) CreateFlow(flow *model.ApprovalFlow) error {
	return migrations.GetDB().Create(flow).Error
}

func (s *ApprovalFlowService) UpdateFlow(id uint, flow *model.ApprovalFlow) error {
	return migrations.GetDB().Model(&model.ApprovalFlow{}).Where("id = ?", id).Updates(flow).Error
}

func (s *ApprovalFlowService) DeleteFlow(id uint) error {
	if err := migrations.GetDB().Where("flow_id = ?", id).Delete(&model.ApprovalNode{}).Error; err != nil {
		return err
	}
	return migrations.GetDB().Delete(&model.ApprovalFlow{}, id).Error
}

func (s *ApprovalFlowService) GetFlowByID(id uint) (*model.ApprovalFlow, error) {
	var flow model.ApprovalFlow
	if err := migrations.GetDB().First(&flow, id).Error; err != nil {
		return nil, err
	}
	return &flow, nil
}

func (s *ApprovalFlowService) GetFlowByTypeID(typeID uint) (*model.ApprovalFlow, error) {
	var flow model.ApprovalFlow
	if err := migrations.GetDB().Where("type_id = ?", typeID).First(&flow).Error; err != nil {
		return nil, err
	}
	return &flow, nil
}

func (s *ApprovalFlowService) ListFlows(page, pageSize int) ([]model.ApprovalFlow, int64, error) {
	var flows []model.ApprovalFlow
	var total int64
	db := migrations.GetDB().Model(&model.ApprovalFlow{})
	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Offset(offset).Limit(pageSize).Find(&flows).Error; err != nil {
		return nil, 0, err
	}
	return flows, total, nil
}

func (s *ApprovalFlowService) GetNodesByFlowID(flowID uint) ([]model.ApprovalNode, error) {
	var nodes []model.ApprovalNode
	if err := migrations.GetDB().Preload("Role").Where("flow_id = ?", flowID).Order("sort_order ASC").Find(&nodes).Error; err != nil {
		return nil, err
	}
	return nodes, nil
}

func (s *ApprovalFlowService) SaveNodes(flowID uint, nodes []model.ApprovalNode) error {
	if err := migrations.GetDB().Where("flow_id = ?", flowID).Delete(&model.ApprovalNode{}).Error; err != nil {
		return err
	}
	for i := range nodes {
		nodes[i].FlowID = flowID
		nodes[i].SortOrder = i + 1
		if err := migrations.GetDB().Create(&nodes[i]).Error; err != nil {
			return err
		}
	}
	return nil
}
