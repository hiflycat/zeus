package service

import (
	"errors"
	"strconv"

	casbinPkg "backend/internal/casbin"
	"backend/internal/model"
	"backend/internal/global"
)

// RoleService 角色服务
type RoleService struct{}

// NewRoleService 创建角色服务
func NewRoleService() *RoleService {
	return &RoleService{}
}

// Create 创建角色
func (s *RoleService) Create(role *model.Role) error {
	// 检查角色名称是否已存在
	var count int64
	if err := global.GetDB().Model(&model.Role{}).Where("name = ?", role.Name).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("角色名称已存在")
	}

	return global.GetDB().Create(role).Error
}

// Update 更新角色
func (s *RoleService) Update(roleID uint, role *model.Role) error {
	var existingRole model.Role
	if err := global.GetDB().Where("id = ?", roleID).First(&existingRole).Error; err != nil {
		return err
	}

	// 检查角色名称是否已被其他角色使用
	if role.Name != existingRole.Name {
		var count int64
		if err := global.GetDB().Model(&model.Role{}).Where("name = ? AND id != ?", role.Name, roleID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("角色名称已存在")
		}
	}

	// 使用 Select 明确指定要更新的字段，包括零值字段
	return global.GetDB().Model(&existingRole).Select("name", "description", "status").Updates(role).Error
}

// Delete 删除角色
func (s *RoleService) Delete(roleID uint) error {
	var role model.Role
	if err := global.GetDB().Where("id = ?", roleID).First(&role).Error; err != nil {
		return err
	}

	// 检查是否有用户使用此角色
	var count int64
	if err := global.GetDB().Model(&model.User{}).Joins("JOIN user_roles ON users.id = user_roles.user_id").Where("user_roles.role_id = ?", roleID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该角色正在被使用，无法删除")
	}

	// 删除 Casbin 策略（使用角色 ID）
	enforcer := casbinPkg.GetEnforcer()
	if enforcer != nil {
		roleIDStr := strconv.FormatUint(uint64(roleID), 10)
		enforcer.RemoveFilteredPolicy(0, roleIDStr)
		enforcer.SavePolicy()
	}

	// 删除 role_menus 中间表记录
	if err := global.GetDB().Table("role_menus").Where("role_id = ?", roleID).Delete(nil).Error; err != nil {
		return err
	}

	// 删除角色
	return global.GetDB().Delete(&role).Error
}

// GetByID 根据 ID 获取角色
func (s *RoleService) GetByID(roleID uint) (*model.Role, error) {
	var role model.Role
	if err := global.GetDB().Preload("Menus").Where("id = ?", roleID).First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

// List 获取角色列表
func (s *RoleService) List(page, pageSize int, keyword string) ([]model.Role, int64, error) {
	var roles []model.Role
	var total int64

	query := global.GetDB().Model(&model.Role{})

	// 搜索
	if keyword != "" {
		query = query.Where("name LIKE ? OR description LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询，预加载菜单
	offset := (page - 1) * pageSize
	if err := query.Preload("Menus").Offset(offset).Limit(pageSize).Find(&roles).Error; err != nil {
		return nil, 0, err
	}

	return roles, total, nil
}

// AssignPolicies 分配 API 权限（使用 Casbin）
func (s *RoleService) AssignPolicies(roleID uint, apiDefIDs []uint) error {
	policyService := NewPolicyService()
	return policyService.UpdateRolePolicies(roleID, apiDefIDs)
}

// GetPolicies 获取角色的 API 权限 ID 列表
func (s *RoleService) GetPolicies(roleID uint) ([]uint, error) {
	policyService := NewPolicyService()
	return policyService.GetRoleAPIDefIDs(roleID)
}

// AssignMenus 分配菜单
func (s *RoleService) AssignMenus(roleID uint, menuIDs []uint) error {
	var role model.Role
	if err := global.GetDB().Where("id = ?", roleID).First(&role).Error; err != nil {
		return err
	}

	var menus []model.Menu
	if err := global.GetDB().Where("id IN ?", menuIDs).Find(&menus).Error; err != nil {
		return err
	}

	return global.GetDB().Model(&role).Association("Menus").Replace(menus)
}
