package service

import (
	"errors"
	"sort"

	"backend/internal/model"
	"backend/migrations"
	"gorm.io/gorm"
)

// MenuService 菜单服务
type MenuService struct{}

// NewMenuService 创建菜单服务
func NewMenuService() *MenuService {
	return &MenuService{}
}

// Create 创建菜单
func (s *MenuService) Create(menu *model.Menu) error {
	// 如果指定了父菜单，检查父菜单是否存在
	if menu.ParentID != nil {
		var parentMenu model.Menu
		if err := migrations.GetDB().Where("id = ?", *menu.ParentID).First(&parentMenu).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("父菜单不存在")
			}
			return err
		}
	}

	return migrations.GetDB().Create(menu).Error
}

// Update 更新菜单
func (s *MenuService) Update(menuID uint, menu *model.Menu) error {
	var existingMenu model.Menu
	if err := migrations.GetDB().Where("id = ?", menuID).First(&existingMenu).Error; err != nil {
		return err
	}

	// 如果指定了父菜单，检查父菜单是否存在且不是自己
	if menu.ParentID != nil {
		if *menu.ParentID == menuID {
			return errors.New("不能将自己设为父菜单")
		}
		var parentMenu model.Menu
		if err := migrations.GetDB().Where("id = ?", *menu.ParentID).First(&parentMenu).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("父菜单不存在")
			}
			return err
		}
	}

	// 使用 Select 明确指定要更新的字段，包括零值字段
	return migrations.GetDB().Model(&existingMenu).Select("name", "path", "icon", "component", "parent_id", "sort", "status").Updates(menu).Error
}

// Delete 删除菜单
func (s *MenuService) Delete(menuID uint) error {
	var menu model.Menu
	if err := migrations.GetDB().Where("id = ?", menuID).First(&menu).Error; err != nil {
		return err
	}

	// 检查是否有子菜单
	var count int64
	if err := migrations.GetDB().Model(&model.Menu{}).Where("parent_id = ?", menuID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该菜单下有子菜单，无法删除")
	}

	// 检查是否有角色使用此菜单
	if err := migrations.GetDB().Model(&model.Role{}).Joins("JOIN role_menus ON roles.id = role_menus.role_id").Where("role_menus.menu_id = ?", menuID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该菜单正在被使用，无法删除")
	}

	// 清理 role_menus 中间表关联（虽然上面已检查无关联，但保险起见）
	if err := migrations.GetDB().Model(&menu).Association("Roles").Clear(); err != nil {
		return err
	}

	return migrations.GetDB().Delete(&menu).Error
}

// GetByID 根据 ID 获取菜单
func (s *MenuService) GetByID(menuID uint) (*model.Menu, error) {
	var menu model.Menu
	if err := migrations.GetDB().Where("id = ?", menuID).First(&menu).Error; err != nil {
		return nil, err
	}
	return &menu, nil
}

// GetAll 获取所有菜单（扁平列表）
func (s *MenuService) GetAll(keyword string) ([]model.Menu, error) {
	var menus []model.Menu

	query := migrations.GetDB().Model(&model.Menu{})

	// 搜索
	if keyword != "" {
		query = query.Where("name LIKE ? OR path LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	if err := query.Order("sort ASC").Find(&menus).Error; err != nil {
		return nil, err
	}

	return menus, nil
}

// BuildTree 构建菜单树
func (s *MenuService) BuildTree(menus []model.Menu) []model.Menu {
	menuMap := make(map[uint]*model.Menu)
	var rootMenus []model.Menu

	// 创建菜单映射
	for i := range menus {
		menuMap[menus[i].ID] = &menus[i]
		menus[i].Children = []model.Menu{}
	}

	// 构建树形结构
	for i := range menus {
		if menus[i].ParentID == nil || *menus[i].ParentID == 0 {
			// 根菜单
			rootMenus = append(rootMenus, menus[i])
		} else {
			// 子菜单
			if parent, ok := menuMap[*menus[i].ParentID]; ok {
				parent.Children = append(parent.Children, menus[i])
			}
		}
	}

	// 对每个节点的子菜单进行排序
	var sortChildren func(*[]model.Menu)
	sortChildren = func(children *[]model.Menu) {
		sort.Slice(*children, func(i, j int) bool {
			return (*children)[i].Sort < (*children)[j].Sort
		})
		for i := range *children {
			if len((*children)[i].Children) > 0 {
				sortChildren(&(*children)[i].Children)
			}
		}
	}
	sortChildren(&rootMenus)

	return rootMenus
}

// List 获取菜单列表（分页）
func (s *MenuService) List(page, pageSize int, keyword string) ([]model.Menu, int64, error) {
	var menus []model.Menu
	var total int64

	query := migrations.GetDB().Model(&model.Menu{})

	// 搜索
	if keyword != "" {
		query = query.Where("name LIKE ? OR path LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := query.Order("sort ASC").Offset(offset).Limit(pageSize).Find(&menus).Error; err != nil {
		return nil, 0, err
	}

	return menus, total, nil
}

// GetUserMenus 获取用户菜单（根据用户角色）
// roleID 为 0 时返回所有角色的菜单，否则只返回指定角色的菜单
func (s *MenuService) GetUserMenus(userID uint, roleID uint) ([]model.Menu, error) {
	var user model.User
	if err := migrations.GetDB().Preload("Roles.Menus", "status = ?", 1).Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}

	// 收集所有菜单并去重
	menuMap := make(map[uint]*model.Menu)
	
	// 如果指定了角色ID，只获取该角色的菜单
	if roleID > 0 {
		for _, role := range user.Roles {
			if role.ID == roleID {
				for _, menu := range role.Menus {
					if menu.Status == 1 {
						menuMap[menu.ID] = &menu
					}
				}
				break
			}
		}
	} else {
		// 获取所有角色的菜单（向后兼容）
		for _, role := range user.Roles {
			for _, menu := range role.Menus {
				if menu.Status == 1 {
					menuMap[menu.ID] = &menu
				}
			}
		}
	}

	// 转换为切片
	var menus []model.Menu
	for _, menu := range menuMap {
		menus = append(menus, *menu)
	}

	// 按 sort 字段排序
	sort.Slice(menus, func(i, j int) bool {
		return menus[i].Sort < menus[j].Sort
	})

	// 构建树形结构
	return s.buildMenuTree(menus), nil
}

// buildMenuTree 构建菜单树
func (s *MenuService) buildMenuTree(menus []model.Menu) []model.Menu {
	if len(menus) == 0 {
		return []model.Menu{}
	}

	// 创建菜单映射（使用切片索引避免指针问题）
	menuMap := make(map[uint]int)
	menuList := make([]model.Menu, len(menus))

	// 复制菜单并初始化 children
	for i := range menus {
		menuList[i] = menus[i]
		menuList[i].Children = []model.Menu{}
		menuMap[menuList[i].ID] = i
	}

	var rootMenus []model.Menu

	// 构建树形结构
	for i := range menuList {
		if menuList[i].ParentID == nil {
			// 根菜单
			rootMenus = append(rootMenus, menuList[i])
		} else {
			// 子菜单，添加到父菜单的 children
			parentID := *menuList[i].ParentID
			if parentIdx, ok := menuMap[parentID]; ok {
				menuList[parentIdx].Children = append(menuList[parentIdx].Children, menuList[i])
			}
		}
	}

	// 重新构建 rootMenus，确保 children 正确
	rootMenus = []model.Menu{}
	for i := range menuList {
		if menuList[i].ParentID == nil {
			rootMenus = append(rootMenus, menuList[i])
		}
	}

	// 对根菜单按 sort 排序
	sort.Slice(rootMenus, func(i, j int) bool {
		return rootMenus[i].Sort < rootMenus[j].Sort
	})

	// 递归排序所有子菜单
	for i := range rootMenus {
		s.sortMenuChildren(&rootMenus[i])
	}

	return rootMenus
}

// sortMenuChildren 递归排序菜单子项
func (s *MenuService) sortMenuChildren(menu *model.Menu) {
	if len(menu.Children) > 0 {
		// 对子菜单按 sort 排序
		sort.Slice(menu.Children, func(i, j int) bool {
			return menu.Children[i].Sort < menu.Children[j].Sort
		})
		// 递归排序子菜单的子菜单
		for i := range menu.Children {
			s.sortMenuChildren(&menu.Children[i])
		}
	}
}
