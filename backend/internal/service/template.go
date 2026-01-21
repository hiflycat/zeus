package service

import (
	"backend/internal/model"
	"backend/migrations"
)

type TemplateService struct{}

func NewTemplateService() *TemplateService {
	return &TemplateService{}
}

func (s *TemplateService) Create(t *model.TicketTemplate) error {
	return migrations.GetDB().Create(t).Error
}

func (s *TemplateService) Update(id uint, t *model.TicketTemplate) error {
	return migrations.GetDB().Model(&model.TicketTemplate{}).Where("id = ?", id).Updates(t).Error
}

func (s *TemplateService) Delete(id uint) error {
	return migrations.GetDB().Delete(&model.TicketTemplate{}, id).Error
}

func (s *TemplateService) GetByID(id uint) (*model.TicketTemplate, error) {
	var t model.TicketTemplate
	if err := migrations.GetDB().First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *TemplateService) List(page, pageSize int, keyword string, typeID uint) ([]model.TicketTemplate, int64, error) {
	var templates []model.TicketTemplate
	var total int64
	db := migrations.GetDB().Model(&model.TicketTemplate{})

	if keyword != "" {
		db = db.Where("name LIKE ?", "%"+keyword+"%")
	}
	if typeID > 0 {
		db = db.Where("type_id = ?", typeID)
	}

	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Order("sort_order ASC, created_at DESC").Offset(offset).Limit(pageSize).Find(&templates).Error; err != nil {
		return nil, 0, err
	}
	return templates, total, nil
}

func (s *TemplateService) ListEnabled(typeID uint) ([]model.TicketTemplate, error) {
	var templates []model.TicketTemplate
	db := migrations.GetDB().Where("enabled = ?", true)
	if typeID > 0 {
		db = db.Where("type_id = ?", typeID)
	}
	if err := db.Order("sort_order ASC").Find(&templates).Error; err != nil {
		return nil, err
	}
	return templates, nil
}
