package service

import (
	"backend/internal/model"
	"backend/internal/global"
)

type TicketTypeService struct{}

func NewTicketTypeService() *TicketTypeService {
	return &TicketTypeService{}
}

func (s *TicketTypeService) Create(t *model.TicketType) error {
	return global.GetDB().Create(t).Error
}

func (s *TicketTypeService) Update(id uint, t *model.TicketType) error {
	return global.GetDB().Model(&model.TicketType{}).Where("id = ?", id).Updates(t).Error
}

func (s *TicketTypeService) Delete(id uint) error {
	return global.GetDB().Delete(&model.TicketType{}, id).Error
}

func (s *TicketTypeService) GetByID(id uint) (*model.TicketType, error) {
	var t model.TicketType
	if err := global.GetDB().First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *TicketTypeService) List(page, pageSize int, keyword string) ([]model.TicketType, int64, error) {
	var types []model.TicketType
	var total int64
	db := global.GetDB().Model(&model.TicketType{})
	if keyword != "" {
		db = db.Where("name LIKE ?", "%"+keyword+"%")
	}
	db.Count(&total)
	offset := (page - 1) * pageSize
	if err := db.Offset(offset).Limit(pageSize).Find(&types).Error; err != nil {
		return nil, 0, err
	}
	return types, total, nil
}

func (s *TicketTypeService) ListEnabled() ([]model.TicketType, error) {
	var types []model.TicketType
	if err := global.GetDB().Where("enabled = ?", true).Find(&types).Error; err != nil {
		return nil, err
	}
	return types, nil
}
