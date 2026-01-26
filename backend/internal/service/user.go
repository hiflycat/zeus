package service

import (
	"errors"

	"backend/internal/model"
	"backend/internal/global"
	"backend/pkg/utils"
)

// UserService 用户服务
type UserService struct{}

// NewUserService 创建用户服务
func NewUserService() *UserService {
	return &UserService{}
}

// Create 创建用户
func (s *UserService) Create(user *model.User) error {
	// 检查用户名是否已存在
	var count int64
	if err := global.GetDB().Model(&model.User{}).Where("username = ?", user.Username).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("用户名已存在")
	}

	// 检查邮箱是否已存在
	if user.Email != "" {
		if err := global.GetDB().Model(&model.User{}).Where("email = ?", user.Email).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("邮箱已存在")
		}
	}

	// 加密密码
	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashedPassword

	// 创建用户
	return global.GetDB().Create(user).Error
}

// Update 更新用户
func (s *UserService) Update(userID uint, user *model.User) error {
	var existingUser model.User
	if err := global.GetDB().Where("id = ?", userID).First(&existingUser).Error; err != nil {
		return err
	}

	// 检查用户名是否已被其他用户使用
	if user.Username != existingUser.Username {
		var count int64
		if err := global.GetDB().Model(&model.User{}).Where("username = ? AND id != ?", user.Username, userID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("用户名已存在")
		}
	}

	// 检查邮箱是否已被其他用户使用
	if user.Email != "" && user.Email != existingUser.Email {
		var count int64
		if err := global.GetDB().Model(&model.User{}).Where("email = ? AND id != ?", user.Email, userID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("邮箱已存在")
		}
	}

	// 如果提供了新密码，则加密
	if user.Password != "" {
		hashedPassword, err := utils.HashPassword(user.Password)
		if err != nil {
			return err
		}
		user.Password = hashedPassword
	} else {
		user.Password = existingUser.Password
	}

	// 使用 Select 明确指定要更新的字段，包括零值字段
	if user.Password != "" {
		return global.GetDB().Model(&existingUser).Select("username", "email", "phone", "status", "password").Updates(user).Error
	}
	return global.GetDB().Model(&existingUser).Select("username", "email", "phone", "status").Updates(user).Error
}

// Delete 删除用户
func (s *UserService) Delete(userID uint) error {
	var user model.User
	if err := global.GetDB().Where("id = ?", userID).First(&user).Error; err != nil {
		return err
	}

	// 清理 user_roles 中间表关联
	if err := global.GetDB().Model(&user).Association("Roles").Clear(); err != nil {
		return err
	}

	// 删除用户
	return global.GetDB().Delete(&user).Error
}

// GetByID 根据 ID 获取用户
func (s *UserService) GetByID(userID uint) (*model.User, error) {
	var user model.User
	if err := global.GetDB().Preload("Roles").Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// List 获取用户列表
func (s *UserService) List(page, pageSize int, keyword string) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	query := global.GetDB().Model(&model.User{})

	// 搜索
	if keyword != "" {
		query = query.Where("username LIKE ? OR email LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := query.Preload("Roles").Offset(offset).Limit(pageSize).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// AssignRoles 分配角色
func (s *UserService) AssignRoles(userID uint, roleIDs []uint) error {
	var user model.User
	if err := global.GetDB().Where("id = ?", userID).First(&user).Error; err != nil {
		return err
	}

	var roles []model.Role
	if err := global.GetDB().Where("id IN ?", roleIDs).Find(&roles).Error; err != nil {
		return err
	}

	return global.GetDB().Model(&user).Association("Roles").Replace(roles)
}
