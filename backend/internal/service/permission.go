package service

import (
	"errors"

	"backend/internal/model"
	"backend/migrations"
)

// PermissionService 权限服务
type PermissionService struct{}

// NewPermissionService 创建权限服务
func NewPermissionService() *PermissionService {
	return &PermissionService{}
}

// Create 创建权限
func (s *PermissionService) Create(permission *model.Permission) error {
	// 检查 API + Method 组合是否已存在
	var count int64
	if err := migrations.GetDB().Model(&model.Permission{}).Where("api = ? AND method = ?", permission.API, permission.Method).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该 API 路径和请求方法的组合已存在")
	}

	return migrations.GetDB().Create(permission).Error
}

// Update 更新权限
func (s *PermissionService) Update(permissionID uint, permission *model.Permission) error {
	var existingPermission model.Permission
	if err := migrations.GetDB().Where("id = ?", permissionID).First(&existingPermission).Error; err != nil {
		return err
	}

	// 检查 API + Method 组合是否已被其他权限使用
	if permission.API != existingPermission.API || permission.Method != existingPermission.Method {
		var count int64
		if err := migrations.GetDB().Model(&model.Permission{}).Where("api = ? AND method = ? AND id != ?", permission.API, permission.Method, permissionID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("该 API 路径和请求方法的组合已存在")
		}
	}

	return migrations.GetDB().Model(&existingPermission).Updates(permission).Error
}

// CheckPermissionByAPI 检查用户是否有访问指定 API 的权限
// roleID 为 0 时检查所有角色权限，否则只检查指定角色的权限
func (s *PermissionService) CheckPermissionByAPI(userID uint, method, path string, roleID uint) (bool, error) {
	var user model.User
	if err := migrations.GetDB().Preload("Roles.Permissions").Where("id = ?", userID).First(&user).Error; err != nil {
		return false, err
	}

	// 如果指定了角色ID，只检查该角色的权限
	if roleID > 0 {
		for _, role := range user.Roles {
			if role.ID == roleID {
				for _, permission := range role.Permissions {
					if permission.Method == method && permission.API == path {
						return true, nil
					}
				}
				return false, nil
			}
		}
		// 如果用户没有该角色，返回 false
		return false, nil
	}

	// 检查用户的所有角色权限（向后兼容）
	for _, role := range user.Roles {
		for _, permission := range role.Permissions {
			if permission.Method == method && permission.API == path {
				return true, nil
			}
		}
	}

	return false, nil
}

// Delete 删除权限
func (s *PermissionService) Delete(permissionID uint) error {
	var permission model.Permission
	if err := migrations.GetDB().Where("id = ?", permissionID).First(&permission).Error; err != nil {
		return err
	}

	// 检查是否有角色使用此权限
	var count int64
	if err := migrations.GetDB().Model(&model.Role{}).Joins("JOIN role_permissions ON roles.id = role_permissions.role_id").Where("role_permissions.permission_id = ?", permissionID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该权限正在被使用，无法删除")
	}

	// 清理 role_permissions 中间表关联（虽然上面已检查无关联，但保险起见）
	if err := migrations.GetDB().Model(&permission).Association("Roles").Clear(); err != nil {
		return err
	}

	return migrations.GetDB().Delete(&permission).Error
}

// GetByID 根据 ID 获取权限
func (s *PermissionService) GetByID(permissionID uint) (*model.Permission, error) {
	var permission model.Permission
	if err := migrations.GetDB().Where("id = ?", permissionID).First(&permission).Error; err != nil {
		return nil, err
	}
	return &permission, nil
}

// List 获取权限列表
func (s *PermissionService) List(page, pageSize int, keyword, resource string) ([]model.Permission, int64, error) {
	var permissions []model.Permission
	var total int64

	query := migrations.GetDB().Model(&model.Permission{})

	// 搜索
	if keyword != "" {
		query = query.Where("name LIKE ? OR api LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 按资源筛选
	if resource != "" {
		query = query.Where("resource = ?", resource)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&permissions).Error; err != nil {
		return nil, 0, err
	}

	return permissions, total, nil
}

// GetResources 获取所有资源类型
func (s *PermissionService) GetResources() ([]string, error) {
	var resources []string
	if err := migrations.GetDB().Model(&model.Permission{}).
		Distinct("resource").
		Pluck("resource", &resources).Error; err != nil {
		return nil, err
	}
	return resources, nil
}
