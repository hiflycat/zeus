package service

import (
	"errors"
	"sort"

	"backend/internal/model"
	"backend/internal/global"
	"gorm.io/gorm"
)

// NavigationCategoryService 网站分类服务
type NavigationCategoryService struct{}

// NewNavigationCategoryService 创建网站分类服务
func NewNavigationCategoryService() *NavigationCategoryService {
	return &NavigationCategoryService{}
}

// Create 创建网站分类
func (s *NavigationCategoryService) Create(category *model.NavigationCategory) error {
	// 如果指定了父分类，检查父分类是否存在
	if category.ParentID != nil {
		var parentCategory model.NavigationCategory
		if err := global.GetDB().Where("id = ?", *category.ParentID).First(&parentCategory).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("父分类不存在")
			}
			return err
		}
	}

	return global.GetDB().Create(category).Error
}

// Update 更新网站分类
func (s *NavigationCategoryService) Update(categoryID uint, category *model.NavigationCategory) error {
	var existingCategory model.NavigationCategory
	if err := global.GetDB().Where("id = ?", categoryID).First(&existingCategory).Error; err != nil {
		return err
	}

	// 如果指定了父分类，检查父分类是否存在且不是自己
	if category.ParentID != nil {
		if *category.ParentID == categoryID {
			return errors.New("不能将自己设为父分类")
		}
		var parentCategory model.NavigationCategory
		if err := global.GetDB().Where("id = ?", *category.ParentID).First(&parentCategory).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("父分类不存在")
			}
			return err
		}
	}

	// 使用 Select 明确指定要更新的字段
	return global.GetDB().Model(&existingCategory).Select("name", "description", "icon", "parent_id", "sort").Updates(category).Error
}

// Delete 删除网站分类
func (s *NavigationCategoryService) Delete(categoryID uint) error {
	var category model.NavigationCategory
	if err := global.GetDB().Where("id = ?", categoryID).First(&category).Error; err != nil {
		return err
	}

	// 检查是否有子分类
	var count int64
	if err := global.GetDB().Model(&model.NavigationCategory{}).Where("parent_id = ?", categoryID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该分类下有子分类，无法删除")
	}

	// 检查是否有网站使用此分类
	if err := global.GetDB().Model(&model.Navigation{}).Where("category_id = ?", categoryID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该分类下有网站，无法删除")
	}

	return global.GetDB().Delete(&category).Error
}

// GetByID 根据 ID 获取网站分类
func (s *NavigationCategoryService) GetByID(categoryID uint) (*model.NavigationCategory, error) {
	var category model.NavigationCategory
	if err := global.GetDB().Where("id = ?", categoryID).First(&category).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

// GetAll 获取所有网站分类（扁平列表）
func (s *NavigationCategoryService) GetAll(keyword string) ([]model.NavigationCategory, error) {
	var categories []model.NavigationCategory

	query := global.GetDB().Model(&model.NavigationCategory{})

	// 搜索
	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}

	if err := query.Order("sort ASC").Find(&categories).Error; err != nil {
		return nil, err
	}

	return categories, nil
}

// BuildTree 构建分类树
func (s *NavigationCategoryService) BuildTree(categories []model.NavigationCategory) []model.NavigationCategory {
	if len(categories) == 0 {
		return []model.NavigationCategory{}
	}

	// 创建分类映射
	categoryMap := make(map[uint]*model.NavigationCategory)
	
	// 初始化所有分类的 Children 字段，并创建映射
	for i := range categories {
		categories[i].Children = []model.NavigationCategory{}
		categoryMap[categories[i].ID] = &categories[i]
	}

	// 构建树形结构：将所有子分类添加到其父分类的 Children 中
	for i := range categories {
		if categories[i].ParentID != nil && *categories[i].ParentID != 0 {
			// 子分类：添加到父分类的 Children 中
			if parent, ok := categoryMap[*categories[i].ParentID]; ok {
				// 直接操作父分类的 Children，使用指针确保嵌套子分类也能正确包含
				parent.Children = append(parent.Children, categories[i])
			}
		}
	}

	// 收集根分类（没有父分类的分类）
	// 注意：由于我们直接操作了 categoryMap 中的指针，所以 categories 中的 Children 已经更新
	var rootCategories []model.NavigationCategory
	for i := range categories {
		if categories[i].ParentID == nil || *categories[i].ParentID == 0 {
			// 直接使用 categories[i]，因为它的 Children 已经通过指针操作更新了
			rootCategories = append(rootCategories, categories[i])
		}
	}

	// 对每个节点的子分类进行排序
	var sortChildren func(*[]model.NavigationCategory)
	sortChildren = func(children *[]model.NavigationCategory) {
		sort.Slice(*children, func(i, j int) bool {
			return (*children)[i].Sort < (*children)[j].Sort
		})
		for i := range *children {
			if len((*children)[i].Children) > 0 {
				sortChildren(&(*children)[i].Children)
			}
		}
	}
	sortChildren(&rootCategories)

	return rootCategories
}

// List 获取网站分类列表（分页）
func (s *NavigationCategoryService) List(page, pageSize int, keyword string) ([]model.NavigationCategory, int64, error) {
	var categories []model.NavigationCategory
	var total int64

	query := global.GetDB().Model(&model.NavigationCategory{})

	// 搜索
	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := query.Order("sort ASC").Offset(offset).Limit(pageSize).Find(&categories).Error; err != nil {
		return nil, 0, err
	}

	return categories, total, nil
}
