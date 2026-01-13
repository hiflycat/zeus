package service

import (
	"errors"
	"time"

	"backend/internal/config"
	"backend/internal/model"
	"backend/migrations"
	"backend/pkg/jwt"
	"backend/pkg/utils"
	"gorm.io/gorm"
)

// AuthService 认证服务
type AuthService struct{}

// NewAuthService 创建认证服务
func NewAuthService() *AuthService {
	return &AuthService{}
}

// Login 登录
func (s *AuthService) Login(username, password string) (string, *model.User, error) {
	var user model.User

	// 查询用户
	if err := migrations.GetDB().Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, errors.New("用户名或密码错误")
		}
		return "", nil, err
	}

	// 检查用户状态
	if user.Status != 1 {
		return "", nil, errors.New("用户已被禁用")
	}

	// 验证密码
	if !utils.CheckPassword(password, user.Password) {
		return "", nil, errors.New("用户名或密码错误")
	}

	// 生成 Token（使用配置中的过期时间）
	cfg := config.Get()
	if cfg == nil {
		// 如果配置未加载，使用默认值 24 小时
		token, err := jwt.GenerateToken(user.ID, user.Username, 24*time.Hour)
		if err != nil {
			return "", nil, err
		}
		return token, &user, nil
	}
	token, err := jwt.GenerateToken(user.ID, user.Username, cfg.JWT.Expiration)
	if err != nil {
		return "", nil, err
	}

	return token, &user, nil
}

// GetUserByID 根据 ID 获取用户
func (s *AuthService) GetUserByID(userID uint) (*model.User, error) {
	var user model.User
	if err := migrations.GetDB().Preload("Roles").Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// ChangePassword 修改密码
func (s *AuthService) ChangePassword(userID uint, oldPassword, newPassword string) error {
	var user model.User
	if err := migrations.GetDB().Where("id = ?", userID).First(&user).Error; err != nil {
		return errors.New("用户不存在")
	}

	// 验证旧密码
	if !utils.CheckPassword(oldPassword, user.Password) {
		return errors.New("当前密码错误")
	}

	// 验证新密码长度
	if len(newPassword) < 6 {
		return errors.New("新密码长度至少6位")
	}

	// 加密新密码
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return errors.New("密码加密失败")
	}

	// 更新密码
	if err := migrations.GetDB().Model(&user).Update("password", hashedPassword).Error; err != nil {
		return errors.New("密码更新失败")
	}

	return nil
}
