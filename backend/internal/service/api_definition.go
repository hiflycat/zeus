package service

import (
	"errors"

	"backend/internal/model"
	"backend/migrations"
)

// APIDefinitionService API 定义服务
type APIDefinitionService struct{}

// NewAPIDefinitionService 创建 API 定义服务
func NewAPIDefinitionService() *APIDefinitionService {
	return &APIDefinitionService{}
}

// Create 创建 API 定义
func (s *APIDefinitionService) Create(apiDef *model.APIDefinition) error {
	var count int64
	if err := migrations.GetDB().Model(&model.APIDefinition{}).Where("path = ? AND method = ?", apiDef.Path, apiDef.Method).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该 API 路径和请求方法的组合已存在")
	}
	return migrations.GetDB().Create(apiDef).Error
}

// Update 更新 API 定义
func (s *APIDefinitionService) Update(id uint, apiDef *model.APIDefinition) error {
	var existing model.APIDefinition
	if err := migrations.GetDB().Where("id = ?", id).First(&existing).Error; err != nil {
		return err
	}

	if apiDef.Path != existing.Path || apiDef.Method != existing.Method {
		var count int64
		if err := migrations.GetDB().Model(&model.APIDefinition{}).Where("path = ? AND method = ? AND id != ?", apiDef.Path, apiDef.Method, id).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("该 API 路径和请求方法的组合已存在")
		}
	}

	return migrations.GetDB().Model(&existing).Updates(apiDef).Error
}

// Delete 删除 API 定义
func (s *APIDefinitionService) Delete(id uint) error {
	var apiDef model.APIDefinition
	if err := migrations.GetDB().Where("id = ?", id).First(&apiDef).Error; err != nil {
		return err
	}
	return migrations.GetDB().Delete(&apiDef).Error
}

// GetByID 根据 ID 获取 API 定义
func (s *APIDefinitionService) GetByID(id uint) (*model.APIDefinition, error) {
	var apiDef model.APIDefinition
	if err := migrations.GetDB().Where("id = ?", id).First(&apiDef).Error; err != nil {
		return nil, err
	}
	return &apiDef, nil
}

// List 获取 API 定义列表
func (s *APIDefinitionService) List(page, pageSize int, keyword, resource string) ([]model.APIDefinition, int64, error) {
	var apiDefs []model.APIDefinition
	var total int64

	query := migrations.GetDB().Model(&model.APIDefinition{})

	if keyword != "" {
		query = query.Where("name LIKE ? OR path LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if resource != "" {
		query = query.Where("resource = ?", resource)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&apiDefs).Error; err != nil {
		return nil, 0, err
	}

	return apiDefs, total, nil
}

// GetResources 获取所有资源类型
func (s *APIDefinitionService) GetResources() ([]string, error) {
	var resources []string
	if err := migrations.GetDB().Model(&model.APIDefinition{}).Distinct("resource").Pluck("resource", &resources).Error; err != nil {
		return nil, err
	}
	return resources, nil
}

// GetAll 获取所有 API 定义（用于角色分配）
func (s *APIDefinitionService) GetAll() ([]model.APIDefinition, error) {
	var apiDefs []model.APIDefinition
	if err := migrations.GetDB().Find(&apiDefs).Error; err != nil {
		return nil, err
	}
	return apiDefs, nil
}
