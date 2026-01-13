package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"backend/internal/config"
	"backend/internal/model"
	"backend/migrations"
	"backend/pkg/jwt"
	"backend/pkg/utils"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

// OIDCService OIDC 认证服务
type OIDCService struct {
	provider     *oidc.Provider
	oauth2Config *oauth2.Config
	verifier     *oidc.IDTokenVerifier
}

// NewOIDCService 创建 OIDC 服务（从数据库读取配置）
func NewOIDCService() (*OIDCService, error) {
	// 从数据库读取 OIDC 配置
	systemConfigService := NewSystemConfigService()
	oidcConfig, err := systemConfigService.GetOIDCConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get OIDC config: %w", err)
	}

	if !oidcConfig.Enabled {
		return nil, errors.New("OIDC is not enabled")
	}

	if oidcConfig.Issuer == "" || oidcConfig.ClientID == "" || oidcConfig.ClientSecret == "" {
		return nil, errors.New("OIDC configuration is incomplete")
	}

	ctx := context.Background()
	provider, err := oidc.NewProvider(ctx, oidcConfig.Issuer)
	if err != nil {
		return nil, fmt.Errorf("failed to create OIDC provider: %w", err)
	}

	oauth2Config := &oauth2.Config{
		ClientID:     oidcConfig.ClientID,
		ClientSecret: oidcConfig.ClientSecret,
		RedirectURL:  oidcConfig.RedirectURL,
		Scopes:       strings.Split(oidcConfig.Scopes, " "),
		Endpoint:     provider.Endpoint(),
	}

	verifier := provider.Verifier(&oidc.Config{
		ClientID: oidcConfig.ClientID,
	})

	return &OIDCService{
		provider:     provider,
		oauth2Config: oauth2Config,
		verifier:     verifier,
	}, nil
}

// GetAuthURL 获取授权 URL（不使用 state）
func (s *OIDCService) GetAuthURL() string {
	return s.oauth2Config.AuthCodeURL("", oauth2.AccessTypeOffline)
}

// ExchangeCode 交换授权码获取 token
func (s *OIDCService) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauth2Config.Exchange(ctx, code)
}

// VerifyToken 验证 ID token
func (s *OIDCService) VerifyToken(ctx context.Context, token string) (*oidc.IDToken, error) {
	return s.verifier.Verify(ctx, token)
}

// GetUserInfo 获取用户信息
func (s *OIDCService) GetUserInfo(ctx context.Context, token *oauth2.Token) (map[string]interface{}, error) {
	// 从 token 中提取 ID token
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("id_token not found in token")
	}

	// 验证 ID token
	idToken, err := s.VerifyToken(ctx, rawIDToken)
	if err != nil {
		return nil, fmt.Errorf("failed to verify ID token: %w", err)
	}

	// 提取用户信息
	var claims map[string]interface{}
	if err := idToken.Claims(&claims); err != nil {
		return nil, fmt.Errorf("failed to extract claims: %w", err)
	}

	return claims, nil
}

// GetUserInfoWithIDToken 获取用户信息并返回原始 id_token
func (s *OIDCService) GetUserInfoWithIDToken(ctx context.Context, token *oauth2.Token) (map[string]interface{}, string, error) {
	// 从 token 中提取 ID token
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, "", errors.New("id_token not found in token")
	}

	// 验证 ID token
	idToken, err := s.VerifyToken(ctx, rawIDToken)
	if err != nil {
		return nil, "", fmt.Errorf("failed to verify ID token: %w", err)
	}

	// 提取用户信息
	var claims map[string]interface{}
	if err := idToken.Claims(&claims); err != nil {
		return nil, "", fmt.Errorf("failed to extract claims: %w", err)
	}

	return claims, rawIDToken, nil
}

// LoginOrCreateUser 登录或创建用户
func (s *OIDCService) LoginOrCreateUser(claims map[string]interface{}) (string, *model.User, error) {
	// 从数据库读取 OIDC 配置
	systemConfigService := NewSystemConfigService()
	oidcConfig, err := systemConfigService.GetOIDCConfig()
	if err != nil {
		return "", nil, fmt.Errorf("failed to get OIDC config: %w", err)
	}

	// 提取用户信息
	sub, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)
	name, _ := claims["name"].(string)
	preferredUsername, _ := claims["preferred_username"].(string)

	if sub == "" {
		return "", nil, errors.New("sub claim is required")
	}

	// 查找或创建用户
	var user model.User
	username := preferredUsername
	if username == "" {
		username, _ = claims["displayName"].(string)
	}
	if username == "" {
		username = email
	}
	if username == "" {
		username = name
	}
	if username == "" {
		username = sub
	}

	// 尝试通过 email 查找用户
	if email != "" {
		if err := migrations.GetDB().Where("email = ?", email).First(&user).Error; err == nil {
			// 用户已存在，只更新信息，不更新角色
			user.Username = username
			if name != "" {
				// 可以在这里更新其他字段
			}
			migrations.GetDB().Save(&user)
		}
	}

	// 如果用户不存在，尝试通过 sub 查找（假设 sub 存储在某个字段中）
	// 这里我们需要在 User 模型中添加一个 oidc_sub 字段来存储 OIDC subject
	// 为了简化，我们暂时使用 email 或 username 来匹配

	// 如果用户仍然不存在且允许自动创建
	if user.ID == 0 {
		if !oidcConfig.AutoCreateUser {
			return "", nil, errors.New("user not found and auto create is disabled")
		}

		// 创建新用户
		user = model.User{
			Username: username,
			Email:    email,
			Status:   1, // 默认启用
		}

		// 生成随机密码（OIDC 用户不需要密码，但数据库字段要求非空）
		randomPassword := generateRandomPassword()
		hashedPassword, err := HashPasswordForOIDC(randomPassword)
		if err != nil {
			return "", nil, fmt.Errorf("failed to hash password: %w", err)
		}
		user.Password = hashedPassword

		if err := migrations.GetDB().Create(&user).Error; err != nil {
			return "", nil, fmt.Errorf("failed to create user: %w", err)
		}

		// 只在新创建用户时分配配置的默认角色
		if len(oidcConfig.DefaultRoles) > 0 {
			var roles []model.Role
			// 查找已存在的角色（配置中的角色应该已经存在）
			if err := migrations.GetDB().Where("id IN ?", oidcConfig.DefaultRoles).Find(&roles).Error; err != nil {
				return "", nil, fmt.Errorf("failed to find roles: %w", err)
			}

			// 如果找到的角色数量少于配置的数量，说明有些角色不存在
			if len(roles) < len(oidcConfig.DefaultRoles) {
				return "", nil, fmt.Errorf("some default roles not found: %v", oidcConfig.DefaultRoles)
			}

			// 分配角色给新用户
			if len(roles) > 0 {
				if err := migrations.GetDB().Model(&user).Association("Roles").Append(roles); err != nil {
					return "", nil, fmt.Errorf("failed to assign roles to user: %w", err)
				}
			}
		}
	}

	// 检查用户状态
	if user.Status != 1 {
		return "", nil, errors.New("user is disabled")
	}

	// 生成 JWT token
	cfgJWT := config.Get()
	token, err := jwt.GenerateToken(user.ID, user.Username, cfgJWT.JWT.Expiration)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, &user, nil
}

// generateRandomPassword 生成随机密码
func generateRandomPassword() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// HashPasswordForOIDC 为 OIDC 用户生成密码哈希（使用随机密码）
func HashPasswordForOIDC(password string) (string, error) {
	// 使用与普通用户相同的密码哈希方法
	return utils.HashPassword(password)
}
