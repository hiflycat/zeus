package service

import (
	"errors"

	"backend/internal/model"
	"backend/migrations"
	"gorm.io/gorm"
)

// NavigationService 网站服务
type NavigationService struct{}

// NewNavigationService 创建网站服务
func NewNavigationService() *NavigationService {
	return &NavigationService{}
}

// Create 创建网站
func (s *NavigationService) Create(navigation *model.Navigation) error {
	// 如果指定了分类，检查分类是否存在
	if navigation.CategoryID != nil {
		var category model.NavigationCategory
		if err := migrations.GetDB().Where("id = ?", *navigation.CategoryID).First(&category).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("分类不存在")
			}
			return err
		}
	}

	return migrations.GetDB().Create(navigation).Error
}

// Update 更新网站
func (s *NavigationService) Update(navigationID uint, navigation *model.Navigation) error {
	var existingNavigation model.Navigation
	if err := migrations.GetDB().Where("id = ?", navigationID).First(&existingNavigation).Error; err != nil {
		return err
	}

	// 如果指定了分类，检查分类是否存在
	if navigation.CategoryID != nil {
		var category model.NavigationCategory
		if err := migrations.GetDB().Where("id = ?", *navigation.CategoryID).First(&category).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("分类不存在")
			}
			return err
		}
	}

	// 使用 Select 明确指定要更新的字段
	return migrations.GetDB().Model(&existingNavigation).Select("name", "url", "icon", "description", "category_id", "sort", "status").Updates(navigation).Error
}

// Delete 删除网站
func (s *NavigationService) Delete(navigationID uint) error {
	var navigation model.Navigation
	if err := migrations.GetDB().Where("id = ?", navigationID).First(&navigation).Error; err != nil {
		return err
	}

	return migrations.GetDB().Delete(&navigation).Error
}

// GetByID 根据 ID 获取网站
func (s *NavigationService) GetByID(navigationID uint) (*model.Navigation, error) {
	var navigation model.Navigation
	if err := migrations.GetDB().Preload("Category").Where("id = ?", navigationID).First(&navigation).Error; err != nil {
		return nil, err
	}
	return &navigation, nil
}

// List 获取网站列表（分页）
func (s *NavigationService) List(page, pageSize int, keyword string, categoryID *uint) ([]model.Navigation, int64, error) {
	var navigations []model.Navigation
	var total int64

	query := migrations.GetDB().Model(&model.Navigation{}).Preload("Category")

	// 搜索
	if keyword != "" {
		query = query.Where("name LIKE ? OR url LIKE ? OR description LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 按分类筛选
	if categoryID != nil {
		query = query.Where("category_id = ?", *categoryID)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := query.Order("sort ASC").Offset(offset).Limit(pageSize).Find(&navigations).Error; err != nil {
		return nil, 0, err
	}

	return navigations, total, nil
}
