package service

import (
	"errors"

	"backend/internal/model"
	"backend/migrations"

	"gorm.io/gorm"
)

type FormTemplateService struct{}

func NewFormTemplateService() *FormTemplateService {
	return &FormTemplateService{}
}

func (s *FormTemplateService) Create(t *model.FormTemplate) error {
	return migrations.GetDB().Create(t).Error
}

func (s *FormTemplateService) Update(id uint, t *model.FormTemplate) error {
	return migrations.GetDB().Model(&model.FormTemplate{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name":        t.Name,
		"description": t.Description,
		"enabled":     t.Enabled,
	}).Error
}

func (s *FormTemplateService) Delete(id uint) error {
	// 检查是否有工单类型正在使用该模板
	var count int64
	migrations.GetDB().Model(&model.TicketType{}).Where("template_id = ?", id).Count(&count)
	if count > 0 {
		return errors.New("该模板正在被工单类型使用，无法删除")
	}

	// 删除关联的字段
	if err := migrations.GetDB().Where("template_id = ?", id).Delete(&model.FormField{}).Error; err != nil {
		return err
	}
	return migrations.GetDB().Delete(&model.FormTemplate{}, id).Error
}

func (s *FormTemplateService) GetByID(id uint) (*model.FormTemplate, error) {
	var t model.FormTemplate
	if err := migrations.GetDB().Preload("Fields", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *FormTemplateService) List(page, pageSize int, keyword string) ([]model.FormTemplate, int64, error) {
	var templates []model.FormTemplate
	var total int64
	db := migrations.GetDB().Model(&model.FormTemplate{})

	if keyword != "" {
		db = db.Where("name LIKE ?", "%"+keyword+"%")
	}

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&templates).Error; err != nil {
		return nil, 0, err
	}
	return templates, total, nil
}

func (s *FormTemplateService) ListEnabled() ([]model.FormTemplate, error) {
	var templates []model.FormTemplate
	if err := migrations.GetDB().Where("enabled = ?", true).Order("name ASC").Find(&templates).Error; err != nil {
		return nil, err
	}
	return templates, nil
}

// GetFields 获取模板的所有字段
func (s *FormTemplateService) GetFields(templateID uint) ([]model.FormField, error) {
	var fields []model.FormField
	if err := migrations.GetDB().Where("template_id = ?", templateID).Order("sort_order ASC").Find(&fields).Error; err != nil {
		return nil, err
	}
	return fields, nil
}

// SaveFields 保存模板字段
func (s *FormTemplateService) SaveFields(templateID uint, fields []model.FormField) error {
	tx := migrations.GetDB().Begin()

	// 删除旧字段
	if err := tx.Where("template_id = ?", templateID).Delete(&model.FormField{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 创建新字段
	for i := range fields {
		fields[i].ID = 0
		fields[i].TemplateID = templateID
		fields[i].SortOrder = i + 1
		if err := tx.Create(&fields[i]).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

// CreateField 创建单个字段
func (s *FormTemplateService) CreateField(field *model.FormField) error {
	// 获取当前最大排序
	var maxSort int
	migrations.GetDB().Model(&model.FormField{}).Where("template_id = ?", field.TemplateID).
		Select("COALESCE(MAX(sort_order), 0)").Scan(&maxSort)
	field.SortOrder = maxSort + 1
	return migrations.GetDB().Create(field).Error
}

// UpdateField 更新单个字段
func (s *FormTemplateService) UpdateField(id uint, field *model.FormField) error {
	return migrations.GetDB().Model(&model.FormField{}).Where("id = ?", id).Updates(field).Error
}

// DeleteField 删除单个字段
func (s *FormTemplateService) DeleteField(id uint) error {
	// 检查是否有工单数据正在使用该字段
	var count int64
	migrations.GetDB().Model(&model.TicketData{}).Where("field_id = ?", id).Count(&count)
	if count > 0 {
		return errors.New("该字段已有工单数据，无法删除")
	}
	return migrations.GetDB().Delete(&model.FormField{}, id).Error
}
