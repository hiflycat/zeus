package handler

import (
	"backend/internal/config"
	"backend/internal/model/request"
	"backend/internal/service"
	"backend/internal/model/response"

	"github.com/gin-gonic/gin"
)

// AuthHandler 认证处理器
type AuthHandler struct {
	authService *service.AuthService
}

// NewAuthHandler 创建认证处理器
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		authService: service.NewAuthService(),
	}
}

// Login 登录
func (h *AuthHandler) Login(c *gin.Context) {
	var req request.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	token, user, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"token": token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"avatar":   user.Avatar,
		},
	})
}

// GetCurrentUser 获取当前用户信息
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, _ := c.Get("user_id")
	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		response.NotFound(c, "用户不存在")
		return
	}

	response.Success(c, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
		"avatar":   user.Avatar,
		"phone":    user.Phone,
		"status":   user.Status,
		"roles":    user.Roles,
	})
}

// Logout 登出
func (h *AuthHandler) Logout(c *gin.Context) {
	// JWT 是无状态的，登出主要是前端删除 Token
	response.Success(c, nil)
}

// GetServerInfo 获取服务器信息
func (h *AuthHandler) GetServerInfo(c *gin.Context) {
	cfg := config.Get()
	info := gin.H{
		"name": cfg.Server.Name,
	}

	// 从数据库读取 OIDC 配置
	systemConfigService := service.NewSystemConfigService()
	oidcConfig, err := systemConfigService.GetOIDCConfig()
	if err == nil && oidcConfig.Enabled {
		info["oidc"] = gin.H{
			"enabled":      oidcConfig.Enabled,
			"issuer":       oidcConfig.Issuer,
			"client_id":    oidcConfig.ClientID,
			"redirect_url": oidcConfig.RedirectURL,
			"scopes":       oidcConfig.Scopes,
		}
	} else {
		info["oidc"] = gin.H{
			"enabled": false,
		}
	}

	response.Success(c, info)
}

// ChangePassword 修改密码
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req request.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 验证新密码和确认密码是否一致
	if req.NewPassword != req.ConfirmPassword {
		response.BadRequest(c, "新密码和确认密码不一致")
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "未登录")
		return
	}

	// 调用服务层修改密码
	if err := h.authService.ChangePassword(userID.(uint), req.OldPassword, req.NewPassword); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"message": "密码修改成功",
	})
}
