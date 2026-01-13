package sso

import (
	"backend/internal/model/sso"
	"backend/migrations"
	"backend/pkg/utils"

	"gorm.io/gorm"
)

// TenantService 租户服务
type TenantService struct{}

// NewTenantService 创建租户服务
func NewTenantService() *TenantService {
	return &TenantService{}
}

// List 获取租户列表
func (s *TenantService) List(page, pageSize int, name string) ([]sso.Tenant, int64, error) {
	var tenants []sso.Tenant
	var total int64

	db := migrations.GetDB().Model(&sso.Tenant{})
	if name != "" {
		db = db.Where("name LIKE ?", "%"+name+"%")
	}

	db.Count(&total)
	err := db.Offset((page - 1) * pageSize).Limit(pageSize).Order("id DESC").Find(&tenants).Error
	return tenants, total, err
}

// GetByID 根据 ID 获取租户
func (s *TenantService) GetByID(id uint) (*sso.Tenant, error) {
	var tenant sso.Tenant
	err := migrations.GetDB().First(&tenant, id).Error
	return &tenant, err
}

// Create 创建租户
func (s *TenantService) Create(tenant *sso.Tenant) error {
	return migrations.GetDB().Create(tenant).Error
}

// Update 更新租户
func (s *TenantService) Update(tenant *sso.Tenant) error {
	return migrations.GetDB().Model(tenant).Updates(map[string]interface{}{
		"name":     tenant.Name,
		"domain":   tenant.Domain,
		"status":   tenant.Status,
		"settings": tenant.Settings,
	}).Error
}

// Delete 删除租户
func (s *TenantService) Delete(id uint) error {
	return migrations.GetDB().Delete(&sso.Tenant{}, id).Error
}

// UserService SSO 用户服务
type UserService struct{}

// NewUserService 创建用户服务
func NewUserService() *UserService {
	return &UserService{}
}

// List 获取用户列表
func (s *UserService) List(tenantID uint, page, pageSize int, username string) ([]sso.User, int64, error) {
	var users []sso.User
	var total int64

	db := migrations.GetDB().Model(&sso.User{}).Preload("Tenant").Preload("Groups")
	if tenantID > 0 {
		db = db.Where("tenant_id = ?", tenantID)
	}
	if username != "" {
		db = db.Where("username LIKE ?", "%"+username+"%")
	}

	db.Count(&total)
	err := db.Offset((page - 1) * pageSize).Limit(pageSize).Order("id DESC").Find(&users).Error
	return users, total, err
}

// GetByID 根据 ID 获取用户
func (s *UserService) GetByID(id uint) (*sso.User, error) {
	var user sso.User
	err := migrations.GetDB().Preload("Groups").Preload("Tenant").First(&user, id).Error
	return &user, err
}

// Create 创建用户
func (s *UserService) Create(user *sso.User) error {
	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashedPassword
	return migrations.GetDB().Create(user).Error
}

// Update 更新用户
func (s *UserService) Update(user *sso.User) error {
	return migrations.GetDB().Model(user).Updates(map[string]interface{}{
		"username":     user.Username,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"phone":        user.Phone,
		"status":       user.Status,
	}).Error
}

// UpdatePassword 更新密码
func (s *UserService) UpdatePassword(id uint, password string) error {
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return err
	}
	return migrations.GetDB().Model(&sso.User{}).Where("id = ?", id).Update("password", hashedPassword).Error
}

// Delete 删除用户
func (s *UserService) Delete(id uint) error {
	return migrations.GetDB().Delete(&sso.User{}, id).Error
}

// AssignGroups 分配用户组
func (s *UserService) AssignGroups(userID uint, groupIDs []uint) error {
	var user sso.User
	if err := migrations.GetDB().First(&user, userID).Error; err != nil {
		return err
	}

	var groups []*sso.Group
	if len(groupIDs) > 0 {
		if err := migrations.GetDB().Where("id IN ?", groupIDs).Find(&groups).Error; err != nil {
			return err
		}
	}

	return migrations.GetDB().Model(&user).Association("Groups").Replace(groups)
}

// GroupService 用户组服务
type GroupService struct{}

// NewGroupService 创建用户组服务
func NewGroupService() *GroupService {
	return &GroupService{}
}

// List 获取用户组列表
func (s *GroupService) List(tenantID uint, page, pageSize int) ([]sso.Group, int64, error) {
	var groups []sso.Group
	var total int64

	db := migrations.GetDB().Model(&sso.Group{}).Preload("Tenant")
	if tenantID > 0 {
		db = db.Where("tenant_id = ?", tenantID)
	}

	db.Count(&total)
	err := db.Offset((page - 1) * pageSize).Limit(pageSize).Order("id DESC").Find(&groups).Error
	return groups, total, err
}

// ListActive 获取启用的用户组列表（用于下拉选择）
func (s *GroupService) ListActive(tenantID uint) ([]sso.Group, error) {
	var groups []sso.Group
	db := migrations.GetDB().Model(&sso.Group{}).Where("status = 1")
	if tenantID > 0 {
		db = db.Where("tenant_id = ?", tenantID)
	}
	err := db.Order("id DESC").Find(&groups).Error
	return groups, err
}

// GetByID 根据 ID 获取用户组
func (s *GroupService) GetByID(id uint) (*sso.Group, error) {
	var group sso.Group
	err := migrations.GetDB().Preload("Users").First(&group, id).Error
	return &group, err
}

// Create 创建用户组
func (s *GroupService) Create(group *sso.Group) error {
	return migrations.GetDB().Create(group).Error
}

// Update 更新用户组
func (s *GroupService) Update(group *sso.Group) error {
	return migrations.GetDB().Model(group).Updates(map[string]interface{}{
		"name":        group.Name,
		"description": group.Description,
		"status":      group.Status,
	}).Error
}

// Delete 删除用户组
func (s *GroupService) Delete(id uint) error {
	return migrations.GetDB().Transaction(func(tx *gorm.DB) error {
		// 先清除关联
		if err := tx.Model(&sso.Group{BaseModelWithSoftDelete: sso.BaseModelWithSoftDelete{BaseModel: sso.BaseModel{ID: id}}}).Association("Users").Clear(); err != nil {
			return err
		}
		return tx.Delete(&sso.Group{}, id).Error
	})
}

// OIDCClientService OIDC 客户端服务
type OIDCClientService struct{}

// NewOIDCClientService 创建 OIDC 客户端服务
func NewOIDCClientService() *OIDCClientService {
	return &OIDCClientService{}
}

// List 获取客户端列表
func (s *OIDCClientService) List(tenantID uint, page, pageSize int) ([]sso.OIDCClient, int64, error) {
	var clients []sso.OIDCClient
	var total int64

	db := migrations.GetDB().Model(&sso.OIDCClient{})
	if tenantID > 0 {
		db = db.Where("tenant_id = ?", tenantID)
	}

	db.Count(&total)
	err := db.Offset((page - 1) * pageSize).Limit(pageSize).Order("id DESC").Find(&clients).Error
	return clients, total, err
}

// GetByID 根据 ID 获取客户端
func (s *OIDCClientService) GetByID(id uint) (*sso.OIDCClient, error) {
	var client sso.OIDCClient
	err := migrations.GetDB().First(&client, id).Error
	return &client, err
}

// GetByClientID 根据 ClientID 获取客户端
func (s *OIDCClientService) GetByClientID(clientID string) (*sso.OIDCClient, error) {
	var client sso.OIDCClient
	err := migrations.GetDB().Where("client_id = ?", clientID).First(&client).Error
	return &client, err
}

// Create 创建客户端
func (s *OIDCClientService) Create(client *sso.OIDCClient) error {
	return migrations.GetDB().Create(client).Error
}

// Update 更新客户端
func (s *OIDCClientService) Update(client *sso.OIDCClient) error {
	return migrations.GetDB().Model(client).Updates(map[string]interface{}{
		"client_secret":    client.ClientSecret,
		"name":             client.Name,
		"description":      client.Description,
		"redirect_uris":    client.RedirectURIs,
		"allowed_scopes":   client.AllowedScopes,
		"grant_types":      client.GrantTypes,
		"access_token_ttl": client.AccessTokenTTL,
		"refresh_token_ttl": client.RefreshTokenTTL,
		"status":           client.Status,
	}).Error
}

// Delete 删除客户端
func (s *OIDCClientService) Delete(id uint) error {
	return migrations.GetDB().Delete(&sso.OIDCClient{}, id).Error
}
